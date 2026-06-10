import { useState } from 'react';
import { X } from 'lucide-react';

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const ProfileDialog = ({ user, isSaving, onClose, onSubmit }) => {
  const [firstName, setFirstName] = useState(user?.fullName?.firstName || '');
  const [lastName, setLastName] = useState(user?.fullName?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileImage, setProfileImage] = useState('');
  const [preview, setPreview] = useState(user?.profilePic || '');

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      fullName: { firstName, lastName },
      username,
      ...(profileImage ? { profileImage } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] grid items-center bg-black/55 px-3 py-8">
      <section className="mx-auto w-full max-w-xl rounded-2xl border-[3px] border-black bg-white shadow-[8px_8px_0_#0F172A]">
        <div className="flex items-center justify-between border-b-[3px] border-black bg-[#1E6BFF] px-4 py-3 text-white">
          <h2 className="font-black uppercase italic">Edit profile</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black bg-white text-black">
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        <form className="grid gap-4 p-5" onSubmit={submit}>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-[3px] border-black bg-[#FFD600] text-2xl font-black">
              {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : (firstName?.[0] || 'D')}
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Profile image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await fileToDataUrl(file);
                  setProfileImage(dataUrl);
                  setPreview(dataUrl);
                }}
                className="text-sm font-bold"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">First name</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 rounded-xl border-[3px] border-black px-3 text-sm font-bold" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Last name</span>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 rounded-xl border-[3px] border-black px-3 text-sm font-bold" />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="h-11 rounded-xl border-[3px] border-black px-3 text-sm font-bold" placeholder="optional_handle" />
          </label>
          <button disabled={isSaving} className="h-11 rounded-xl border-[3px] border-black bg-[#00E676] text-sm font-black shadow-[3px_3px_0_#0F172A] disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfileDialog;
