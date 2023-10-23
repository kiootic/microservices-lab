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
      const result = [
        Math.floor(seconds).toString().padStart(2, "0"),
        minutes.toString().padStart(hours === 0 ? 0 : 2, "0"),
      ];

      if (hours !== 0) {
        result.push(hours.toString());
      }

      return result.reverse().join(":");
    }
  }
}
