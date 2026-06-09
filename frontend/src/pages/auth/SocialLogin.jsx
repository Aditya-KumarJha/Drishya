import { useMemo } from 'react';
import { FaGithub } from 'react-icons/fa';
import { API_BASE_URL } from '../../services/apiConfig';

const GoogleMark = () => (
  <span
    aria-hidden="true"
    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xl font-black not-italic leading-none"
    style={{
      backgroundImage: 'conic-gradient(from -45deg, #4285F4 0 25%, #34A853 0 50%, #FBBC05 0 75%, #EA4335 0)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    }}
  >
    G
  </span>
);

const SocialLogin = ({ mode = 'signin' }) => {
  const suffix = useMemo(() => (mode === 'signup' ? '/signup' : ''), [mode]);
  const continueWithGoogle = () => {
    window.location.assign(`${API_BASE_URL}/auth/google${suffix}`);
  };

  const continueWithGithub = () => {
    window.location.assign(`${API_BASE_URL}/auth/github${suffix}`);
  };

  return (
    <div>
        <button
          type="button"
          onClick={continueWithGoogle}
          className="mb-4 inline-flex cursor-pointer h-12 w-full items-center justify-center gap-3 rounded-md border-[3px] border-black bg-white px-3 text-sm font-black uppercase italic shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 sm:h-13"
        >
          <GoogleMark />
          <span className="truncate">Continue with Google</span>
        </button>

             <button
          type="button"
          onClick={continueWithGithub}
          className="mb-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-md border-[3px] border-black bg-white px-3 text-sm font-black uppercase italic shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 sm:h-13"
        >
          <FaGithub size={16} />
          <span className="truncate">Continue with Github</span>
        </button>

        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[10px] font-black uppercase italic tracking-[0.16em] text-black/45">
          <span className="h-[3px] bg-black/15" />
          <span>Email</span>
          <span className="h-[3px] bg-black/15" />
        </div>
    </div>
  )
}

export default SocialLogin;
