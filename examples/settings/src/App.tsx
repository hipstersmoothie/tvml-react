import { Welcome } from "./screens/Onboarding";
import { Settings } from "./screens/Settings";
import { useProfile } from "./store";

// The root screen swaps its template in place: onboarding's Welcome until the
// profile is complete, then Settings (and back again on sign out).
export function App() {
  const [profile] = useProfile();
  return profile.onboarded ? <Settings /> : <Welcome />;
}
