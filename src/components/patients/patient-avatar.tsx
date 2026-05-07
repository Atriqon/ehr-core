import { cn } from '@/lib/utils';

interface PatientAvatarProps {
  patientId: string;
  firstName: string;
  lastName: string;
  // The patient's avatar storage key. When set, the component renders the
  // image via the authenticated route handler; otherwise it shows initials.
  // Pass the column value as-is — it's only used here as a cache-buster.
  avatarStorageKey: string | null;
  // Tailwind size class — width/height + text-size — to keep the markup
  // identical between the small list-row variant (32px) and the large
  // header variant. Pass the full token string to avoid runtime concat.
  className?: string;
  textClassName?: string;
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first}${last}` || '?';
}

export function PatientAvatar({
  patientId,
  firstName,
  lastName,
  avatarStorageKey,
  className,
  textClassName,
}: PatientAvatarProps) {
  const initials = getInitials(firstName, lastName);

  if (avatarStorageKey) {
    // The route ignores `?v=`, but the URL changing forces the browser to
    // bypass its cache entry when the avatar is replaced.
    const cacheKey = avatarStorageKey.split('.')[0]?.slice(0, 12) ?? avatarStorageKey;
    const src = `/api/patients/${patientId}/avatar?v=${cacheKey}`;
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={cn(
          'shrink-0 rounded-full object-cover',
          'bg-blue-100 dark:bg-blue-900/50',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        className,
        textClassName,
      )}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
