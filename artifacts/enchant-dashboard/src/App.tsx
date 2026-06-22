export default function App() {
  // The actual dashboard is served by the API server at the root URL.
  // If someone lands on the Vite dev URL, send them to the right place.
  if (typeof window !== "undefined" && window.location.port === "24180") {
    window.location.replace(
      window.location.protocol + "//" + window.location.hostname + ":8080"
    );
    return null;
  }
  return null;
}
