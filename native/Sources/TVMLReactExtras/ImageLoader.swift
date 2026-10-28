import TVMLKit
import UIKit

// Loads and caches images for the native elements. Callbacks run on main.
final class ImageLoader: @unchecked Sendable {
  static let shared = ImageLoader()

  private let cache = NSCache<NSURL, UIImage>()

  @discardableResult
  func load(_ url: URL, completion: @escaping @MainActor (UIImage?) -> Void) -> URLSessionDataTask? {
    if let cached = cache.object(forKey: url as NSURL) {
      MainActor.assumeIsolated { completion(cached) }
      return nil
    }
    let task = URLSession.shared.dataTask(with: url) { [cache] data, _, _ in
      let image = data.flatMap(UIImage.init(data:))
      if let image { cache.setObject(image, forKey: url as NSURL) }
      DispatchQueue.main.async { completion(image) }
    }
    task.resume()
    return task
  }
}

