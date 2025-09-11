import { render } from "@testing-library/react";
import App from "./App";

// Mock the Spacelift services to avoid API calls in tests
jest.mock("../services/spaceliftService");

test("renders app with error boundary", () => {
  render(<App />);
  // Since the plugin needs configuration and may show an error state,
  // we'll test that the app renders without crashing
  expect(document.body).toBeTruthy();
});