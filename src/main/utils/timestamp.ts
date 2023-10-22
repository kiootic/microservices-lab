export function formatTimestamp(
  timestamp: number,
  format: "compact" | "wide" = "wide",
) {
  timestamp /= 1000;
  const seconds = timestamp % 60;
  const minutes = Math.floor(timestamp / 60) % 60;
  const hours = Math.floor(timestamp / (60 * 60));

  switch (format) {
    case "wide": {
      const result = [
        seconds.toFixed(3).padStart(6, "0"),
        minutes.toString().padStart(2, "0"),
      ];

      if (hours !== 0) {
        result.push(hours.toString());
      }

      return result.reverse().join(":");
    }
    case "compact": {
      const result = [Math.round(seconds * 1000) / 1000 + "s"];
      if (minutes !== 0) {
        result.push(minutes.toString() + "m");
      }
      if (hours !== 0) {
        result.push(hours.toString() + "h");
      }
      return result.reverse().join("");
    }
  }
}
