import { requireUser } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { DEFAULT_AVATAR, clampAvatarScale } from "@/lib/avatar";
import { Nav } from "@/components/Nav";
import { AvatarEditor } from "./AvatarEditor";
import { AvatarSizeSetting } from "./AvatarSizeSetting";
import { ProfilePhotoSetting } from "./ProfilePhotoSetting";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await requireUser();
  // requireUser() returns the public shape (no avatar), so load the full record
  // to seed the editor with the saved face. Fall back to a neutral default.
  const user = await getUserById(me.id);
  const current = user?.avatar ?? DEFAULT_AVATAR;
  // Normalize a possibly-absent/out-of-range stored scale to a usable value.
  const currentScale = clampAvatarScale(user?.avatarScale);

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-white/60">
            Upload a photo, or design a face — whichever you set shows up in
            place of your dot on the graph.
          </p>
        </section>

        <ProfilePhotoSetting
          userId={me.id}
          photoVersion={user?.photoVersion}
          previewAvatar={current}
        />

        <AvatarEditor initial={current} seed={me.id} />

        <AvatarSizeSetting initial={currentScale} preview={current} />
      </div>
    </main>
  );
}
