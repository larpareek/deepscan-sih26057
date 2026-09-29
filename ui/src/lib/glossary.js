// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Plain-language explanations shown in <Term> tooltips.
export const GLOSSARY = {
  "sonar waterfall":
    "The side-scan sonar image, built one ping at a time as the vehicle moves. Each row is one ping; newer pings appear further down.",
  ping: "One pulse of sound and the echoes that come back from it. Each ping becomes one row of the image.",
  "ping header":
    "Data saved with every ping: time, the vehicle's position, heading and altitude. It's how pixels are turned into map coordinates.",
  "swath width":
    "How wide a strip of seabed one ping covers, left and right combined. Here it's 100 m, 50 m to each side.",
  "acoustic shadow":
    "A dark area behind an object where the sound can't reach. Real objects cast a shadow next to their bright echo; a detection that sits entirely in darkness is probably a false alarm, so its score is halved.",
  speckle:
    "Grainy noise that all sonar images have, caused by echoes interfering with each other. Filtering it makes objects easier to see.",
  "confidence threshold":
    "The minimum score a detection needs to be shown. Raise it to see only the model's surest finds; lower it to review borderline ones.",
  confidence: "How sure the model is that a detection is real, from 0 to 100%.",
  "bounding box": "The rectangle drawn around a detected object, in image pixels.",
  geotagged: "Converted from a position in the image to latitude and longitude, using the vehicle's recorded track.",
  auv: "Autonomous Underwater Vehicle: the uncrewed submarine that carries the sonar.",
  "auv track": "The path the vehicle has travelled on this survey. The dashed line is the part still planned.",
  depth: "How far below the sea surface the vehicle is.",
  altitude: "How far above the seabed the sonar is. Too high and the image gets faint; too low and the swath narrows.",
  heading: "The direction the vehicle is travelling, in degrees clockwise from north (000° = north, 090° = east).",
  "pitch / roll": "Nose up/down and side-to-side tilt. Large values smear the sonar image.",
  knots: "Nautical miles per hour. 1 knot ≈ 0.5 m/s.",
  frequency: "The sonar's sound frequency. Higher gives a sharper image but a shorter range.",
};

export function explain(term) {
  return GLOSSARY[term.toLowerCase()];
}
