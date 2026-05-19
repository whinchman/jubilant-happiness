import { APP_NAME } from "@todoer/shared";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>{APP_NAME}</h1>
      <p>Phone app — built phase by phase. Phase 0: skeleton is up.</p>
    </main>
  );
}
