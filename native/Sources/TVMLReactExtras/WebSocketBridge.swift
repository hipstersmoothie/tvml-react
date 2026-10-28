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
  private var closed = Set<Int>()
  private weak var _controller: TVApplicationController?
  private lazy var session = URLSession(
    configuration: .default, delegate: self, delegateQueue: nil)

  var controller: TVApplicationController? {
    get { lock.withLock { _controller } }
    set { lock.withLock { _controller = newValue } }
  }

  /// Adds the webSocket* functions to the bridge object. JavaScript thread.
  func install(on bridge: JSValue) {
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
      finish(id, code: 1006, reason: "Invalid WebSocket URL")
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
      guard let self else { return }
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

  // Reports "close" once per socket and forgets it.
  private func finish(_ id: Int, code: Int, reason: String) {
    let first = lock.withLock { () -> Bool in
      guard !closed.contains(id) else { return false }
      closed.insert(id)
      if let task = sockets.removeValue(forKey: id) {
        idsByTask.removeValue(forKey: task.taskIdentifier)
      }
      return true
    }
    if first { emit(id, "close", code, reason) }
  }

  private func id(for task: URLSessionTask) -> Int? {
    lock.withLock { idsByTask[task.taskIdentifier] }
  }

  private func emit(_ id: Int, _ type: String, _ a: Any = NSNull(), _ b: Any = NSNull()) {
    controller?.evaluate(inJavaScriptContext: { context in
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
    guard let id = id(for: webSocketTask) else { return }
    let text = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
    finish(id, code: closeCode.rawValue, reason: text)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let id = id(for: task) else { return }
    if error != nil { emit(id, "error") }
    // 1006: closed without a close frame (network error, server went away).
    finish(id, code: 1006, reason: error?.localizedDescription ?? "")
  }
}
