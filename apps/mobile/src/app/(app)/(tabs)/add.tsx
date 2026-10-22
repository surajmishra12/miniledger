import { Redirect } from 'expo-router';

/** Placeholder for the bar's Add action; a deep link here simply lands on Home. */
export default function AddPlaceholder() {
  return <Redirect href="/" />;
}
