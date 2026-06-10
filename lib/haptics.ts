import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export { ImpactStyle };

// No-op on the web so the site is unaffected; fires real haptics only inside
// the native iOS shell.
export async function hapticImpact(
  style: ImpactStyle = ImpactStyle.Light
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Haptics are best-effort; never let them break an interaction.
  }
}
