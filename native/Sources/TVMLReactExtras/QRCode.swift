import CoreImage
import CoreImage.CIFilterBuiltins
import TVMLKit
import UIKit

// <qrCode value foreground background>: a QR code drawn natively (offline,
// crisp at any size). Colors are attributes rather than styles, because
// TVMLKit gives every element a default (white) text color.
final class QRCodeView: UIImageView {
  private var value = ""
  private var foreground = UIColor.black
  private var background = UIColor.white

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentMode = .scaleAspectFit
    layer.magnificationFilter = .nearest
  }

  required init?(coder: NSCoder) { fatalError() }

  func update(with element: TVViewElement) {
    value = element.attributes?["value"] ?? ""
    let attributes = element.attributes ?? [:]
    foreground = attributes["foreground"].flatMap(UIColor.init(hex:)) ?? .black
    background = attributes["background"].flatMap(UIColor.init(hex:)) ?? .white
    backgroundColor = background
    image = render()
  }

  private func render() -> UIImage? {
    guard !value.isEmpty else { return nil }
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(value.utf8)
    filter.correctionLevel = "M"
    let colored = CIFilter.falseColor()
    colored.inputImage = filter.outputImage
    colored.color0 = CIColor(color: foreground)
    colored.color1 = CIColor(color: background)
    guard let output = colored.outputImage,
      let cgImage = CIContext().createCGImage(output, from: output.extent)
    else { return nil }
    // One pixel per module; the nearest-neighbour filter keeps edges sharp.
    return UIImage(cgImage: cgImage)
  }
}

extension UIColor {
  /// "#rrggbb" or "#rrggbbaa".
  convenience init?(hex: String) {
    var value = hex.trimmingCharacters(in: .whitespaces)
    if value.hasPrefix("#") { value.removeFirst() }
    guard value.count == 6 || value.count == 8, let number = UInt64(value, radix: 16) else {
      return nil
    }
    let hasAlpha = value.count == 8
    let r = CGFloat((number >> (hasAlpha ? 24 : 16)) & 0xff) / 255
    let g = CGFloat((number >> (hasAlpha ? 16 : 8)) & 0xff) / 255
    let b = CGFloat((number >> (hasAlpha ? 8 : 0)) & 0xff) / 255
    let a = hasAlpha ? CGFloat(number & 0xff) / 255 : 1
    self.init(red: r, green: g, blue: b, alpha: a)
  }
}
