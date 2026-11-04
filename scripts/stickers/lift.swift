// Lifts the foreground subject(s) out of an image with macOS Vision and writes a transparent PNG.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3, let source = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
  FileHandle.standardError.write("usage: lift <in> <out.png>\n".data(using: .utf8)!); exit(1)
}
let handler = VNImageRequestHandler(ciImage: source)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("no subject"); exit(2) }
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
let image = CIImage(cvPixelBuffer: buffer)
let context = CIContext()
guard let cg = context.createCGImage(image, from: image.extent),
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(3) }
CGImageDestinationAddImage(dest, cg, nil)
CGImageDestinationFinalize(dest)
print("lifted", result.allInstances.count, "instances", Int(image.extent.width), "x", Int(image.extent.height))
