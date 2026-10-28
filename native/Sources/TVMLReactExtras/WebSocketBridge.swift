import Foundation
import JavaScriptCore
import TVMLKit

// WebSockets for TVJS, which has none. The JS side (src/websocket.ts) installs
// a standard `WebSocket` class that drives these functions on the
// `TVMLReactNative` bridge object:
//
//   webSocketOpen(id, url, protocols)    open a connection
//   webSocketSend(id, data, isBinary)    send text, or base64-encoded binary
//   webSocketClose(id, code, reason)
//
// and receives events through `TVMLReactNative.onWebSocketEvent(id, type, a, b)`:
//
//   "open"     a = negotiated protocol
//   "message"  a = text or base64 data, b = isBinary
//   "error"
//   "close"    a = code, b = reason
final class WebSocketBridge: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
  private let lock = NSLock()
  private var sockets: [Int: URLSessionWebSocketTask] = [:]
  private var idsByTask: [Int: Int] = [:]
  // Bumped for every new JS context, so events queued for an old context are
  // dropped instead of reaching new sockets that reuse the same ids.
  private var generation = 0
  private weak var _controller: TVApplicationController?
  private lazy var session = URLSession(
    configuration: .default, delegate: self, delegateQueue: nil)

  var controller: TVApplicationController? {
    get { lock.withLock { _controller } }
    set { lock.withLock { _controller = newValue } }
  }

  /// Adds the webSocket* functions to the bridge object. JavaScript thread.
  ///
  /// Runs again for every new JS context (live reload, App.reload). The JS
  /// side starts its socket ids over, so sockets from the previous context
  /// are cancelled and forgotten: otherwise they'd keep running and deliver
  /// into new sockets that reuse their ids.
  func install(on bridge: JSValue) {
    let previous = lock.withLock { () -> [URLSessionWebSocketTask] in
      let tasks = Array(sockets.values)
      sockets.removeAll()
      idsByTask.removeAll()
      generation += 1
      return tasks
    }
    for task in previous {
      task.cancel(with: .goingAway, reason: nil)
    }

    let open: @convention(block) (Int, String, JSValue) -> Void = { [weak self] id, url, protocols in
      let list = (protocols.toArray() as? [String]) ?? []
      self?.open(id: id, url: url, protocols: list)
    }
    let send: @convention(block) (Int, String, Bool) -> Void = { [weak self] id, data, isBinary in
      self?.send(id: id, data: data, isBinary: isBinary)
    }
    let close: @convention(block) (Int, Int, String) -> Void = { [weak self] id, code, reason in
      self?.close(id: id, code: code, reason: reason)
    }
    bridge.setValue(open, forProperty: "webSocketOpen")
    bridge.setValue(send, forProperty: "webSocketSend")
    bridge.setValue(close, forProperty: "webSocketClose")
  }

  private func open(id: Int, url: String, protocols: [String]) {
    guard let parsed = URL(string: url), ["ws", "wss"].contains(parsed.scheme ?? "") else {
      emit(id, "error")
      emit(id, "close", 1006, "Invalid WebSocket URL")
      return
    }
    let task =
      protocols.isEmpty
      ? session.webSocketTask(with: parsed)
      : session.webSocketTask(with: parsed, protocols: protocols)
    lock.withLock {
      sockets[id] = task
      idsByTask[task.taskIdentifier] = id
    }
    task.resume()
    receive(task, id: id)
  }

  private func receive(_ task: URLSessionWebSocketTask, id: Int) {
    task.receive { [weak self] result in
      // Drop messages from sockets that were closed or replaced (JS reload).
      guard let self, self.isCurrent(task, id: id) else { return }
      switch result {
      case .success(.string(let text)):
        self.emit(id, "message", text, false)
        self.receive(task, id: id)
      case .success(.data(let data)):
        self.emit(id, "message", data.base64EncodedString(), true)
        self.receive(task, id: id)
      case .success:
        self.receive(task, id: id)
      case .failure:
        // Reported through the close/complete delegate callbacks.
        break
      }
    }
  }

  private func task(_ id: Int) -> URLSessionWebSocketTask? {
    lock.withLock { sockets[id] }
  }

  private func send(id: Int, data: String, isBinary: Bool) {
    guard let task = task(id) else { return }
    let message: URLSessionWebSocketTask.Message
    if isBinary {
      guard let bytes = Data(base64Encoded: data) else { return }
      message = .data(bytes)
    } else {
      message = .string(data)
    }
    task.send(message) { [weak self] error in
      if error != nil { self?.emit(id, "error") }
    }
  }

  private func close(id: Int, code: Int, reason: String) {
    guard let task = task(id) else { return }
    let closeCode = URLSessionWebSocketTask.CloseCode(rawValue: code) ?? .normalClosure
    task.cancel(with: closeCode, reason: reason.data(using: .utf8))
  }

  private func isCurrent(_ task: URLSessionTask, id: Int) -> Bool {
    lock.withLock { sockets[id] === task }
  }

  // Reports "close" once per socket and forgets it. Later callbacks for the
  // same task (didClose then didComplete) find nothing and do nothing.
  private func finish(_ task: URLSessionTask, code: Int, reason: String) {
    let id = lock.withLock { () -> Int? in
      guard let id = idsByTask[task.taskIdentifier], sockets[id] === task else { return nil }
      sockets.removeValue(forKey: id)
      idsByTask.removeValue(forKey: task.taskIdentifier)
      return id
    }
    if let id { emit(id, "close", code, reason) }
  }

  private func id(for task: URLSessionTask) -> Int? {
    lock.withLock { idsByTask[task.taskIdentifier] }
  }

  private func emit(_ id: Int, _ type: String, _ a: Any = NSNull(), _ b: Any = NSNull()) {
    let sentIn = lock.withLock { generation }
    controller?.evaluate(inJavaScriptContext: { [weak self] context in
      guard let self, self.lock.withLock({ self.generation }) == sentIn else { return }
      guard let bridge = context.objectForKeyedSubscript("TVMLReactNative"),
        let handler = bridge.objectForKeyedSubscript("onWebSocketEvent"),
        !handler.isUndefined, !handler.isNull
      else { return }
      handler.call(withArguments: [id, type, a, b])
    }, completion: nil)
  }

  // MARK: URLSessionWebSocketDelegate

  func urlSession(
    _ session: URLSession, webSocketTask: URLSessionWebSocketTask,
    didOpenWithProtocol protocol: String?
  ) {
    guard let id = id(for: webSocketTask) else { return }
    emit(id, "open", `protocol` ?? "")
  }

  func urlSession(
    _ session: URLSession, webSocketTask: URLSessionWebSocketTask,
    didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?
  ) {
    let text = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
    finish(webSocketTask, code: closeCode.rawValue, reason: text)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let id = id(for: task), isCurrent(task, id: id) else { return }
    if error != nil { emit(id, "error") }
    // 1006: closed without a close frame (network error, server went away).
    finish(task, code: 1006, reason: error?.localizedDescription ?? "")
  }
}
