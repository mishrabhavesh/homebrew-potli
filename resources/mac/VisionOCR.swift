// CopyClip macOS OCR helper.
//
// Invoked as: swift VisionOCR.swift <imagePath> <comma,separated,languages>
// Prints a single line of JSON to stdout: {"text":"..."} or {"error":"..."}
//
// Uses Apple's Vision framework (VNRecognizeTextRequest), which runs entirely
// on-device — nothing here touches the network.

import Vision
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 2 else {
    print("{\"error\":\"missing image path\"}")
    exit(1)
}

let imagePath = args[1]
let languages = args.count >= 3 && !args[2].isEmpty
    ? args[2].split(separator: ",").map(String.init)
    : ["en-US"]

guard
    let image = NSImage(contentsOfFile: imagePath),
    let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    print("{\"error\":\"could not load image\"}")
    exit(1)
}

let semaphore = DispatchSemaphore(value: 0)
var outputLines: [String] = []
var ocrError: String?

let request = VNRecognizeTextRequest { request, error in
    if let error = error {
        ocrError = error.localizedDescription
        semaphore.signal()
        return
    }
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        semaphore.signal()
        return
    }
    for observation in observations {
        if let candidate = observation.topCandidates(1).first {
            outputLines.append(candidate.string)
        }
    }
    semaphore.signal()
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = languages

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    ocrError = error.localizedDescription
}

semaphore.wait()

func jsonEscape(_ s: String) -> String {
    var out = ""
    for ch in s {
        switch ch {
        case "\\": out += "\\\\"
        case "\"": out += "\\\""
        case "\n": out += "\\n"
        case "\r": out += "\\r"
        case "\t": out += "\\t"
        default: out.append(ch)
        }
    }
    return out
}

if let ocrError = ocrError {
    print("{\"error\":\"\(jsonEscape(ocrError))\"}")
    exit(1)
}

let text = outputLines.joined(separator: "\n")
print("{\"text\":\"\(jsonEscape(text))\"}")
