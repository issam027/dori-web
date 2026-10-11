import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const countries = [
  { code: 'FR', dialCode: '+33', groups: [1, 2, 2, 2, 2], placeholder: '6 12 34 56 78' },
  { code: 'TN', dialCode: '+216', groups: [2, 3, 3], placeholder: '20 123 456' },
  { code: 'BE', dialCode: '+32', groups: [3, 2, 2, 2], placeholder: '470 12 34 56' },
  { code: 'CH', dialCode: '+41', groups: [2, 3, 2, 2], placeholder: '79 123 45 67' },
  { code: 'MA', dialCode: '+212', groups: [1, 2, 2, 2, 2], placeholder: '6 12 34 56 78' },
  { code: 'DZ', dialCode: '+213', groups: [1, 2, 2, 2, 2], placeholder: '5 12 34 56 78' },
] as const;

type Country = (typeof countries)[number];

function findCountry(value: string): Country {
  return (
    [...countries]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => value.startsWith(country.dialCode)) ?? countries[0]
  );
}

function formatNationalNumber(value: string, groups: readonly number[]): string {
  let offset = 0;
  return groups
    .map((size) => {
      const group = value.slice(offset, offset + size);
      offset += size;
      return group;
    })
    .filter(Boolean)
    .join(' ');
}

function CountryFlag({ code }: { code: Country['code'] }) {
  return (
    <svg className="country-flag" viewBox="0 0 30 20" aria-hidden="true">
      <use href={`#phone-flag-${code.toLowerCase()}`} />
      <defs>
        <g id="phone-flag-fr">
          <path fill="#002395" d="M0 0h10v20H0z" />
          <path fill="#fff" d="M10 0h10v20H10z" />
          <path fill="#ed2939" d="M20 0h10v20H20z" />
        </g>
        <g id="phone-flag-tn">
          <path fill="#e70013" d="M0 0h30v20H0z" />
          <circle cx="15" cy="10" r="6" fill="#fff" />
          <circle cx="16.5" cy="10" r="4.3" fill="#e70013" />
          <circle cx="18" cy="10" r="3.3" fill="#fff" />
          <path
            fill="#e70013"
            d="m18 7 .7 1.8 2 .1-1.6 1.2.6 1.9-1.7-1-1.7 1 .6-1.9-1.6-1.2 2-.1z"
          />
        </g>
        <g id="phone-flag-be">
          <path fill="#171717" d="M0 0h10v20H0z" />
          <path fill="#fdda24" d="M10 0h10v20H10z" />
          <path fill="#ef3340" d="M20 0h10v20H20z" />
        </g>
        <g id="phone-flag-ch">
          <path fill="#da291c" d="M0 0h30v20H0z" />
          <path fill="#fff" d="M12.5 4h5v4h4v4h-4v4h-5v-4h-4V8h4z" />
        </g>
        <g id="phone-flag-ma">
          <path fill="#c1272d" d="M0 0h30v20H0z" />
          <path
            fill="none"
            stroke="#006233"
            strokeWidth="1.2"
            d="m15 6 1.2 3.1 3.3.2-2.6 2.1.8 3.2-2.7-1.8-2.7 1.8.8-3.2-2.6-2.1 3.3-.2z"
          />
        </g>
        <g id="phone-flag-dz">
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path fill="#006233" d="M0 0h15v20H0z" />
          <circle cx="16" cy="10" r="5" fill="#d21034" />
          <circle cx="17.5" cy="10" r="4" fill="#fff" />
          <path
            fill="#d21034"
            d="m17 7 .7 2 2.1.1-1.7 1.3.6 2-1.7-1.2-1.8 1.2.6-2-1.7-1.3 2.2-.1z"
          />
        </g>
      </defs>
    </svg>
  );
}

export function InternationalPhoneInput({
  value,
  onChange,
  countryLabel,
  phoneLabel,
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  countryLabel: string;
  phoneLabel: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const detectedCountry = findCountry(value);
  const [selectedCode, setSelectedCode] = useState<Country['code']>(detectedCountry.code);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const country = countries.find((item) => item.code === selectedCode) ?? detectedCountry;
  const nationalNumber = value.startsWith(country.dialCode)
    ? value.slice(country.dialCode.length)
    : value.replace(/^\+/, '');
  const maxLength = country.groups.reduce((total, size) => total + size, 0);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
    };
  }, [menuOpen]);

  return (
    <div className="international-phone-input" ref={rootRef}>
      <div className="phone-country-control">
        <button
          type="button"
          className="phone-country-trigger"
          aria-label={`${countryLabel}: ${country.dialCode}`}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={() => {
            setMenuOpen((current) => !current);
          }}
        >
          <CountryFlag code={country.code} />
          <span>{country.dialCode}</span>
          <ChevronDown aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="phone-country-menu" role="listbox" aria-label={countryLabel}>
            {countries.map((item) => (
              <button
                type="button"
                role="option"
                aria-label={item.dialCode}
                aria-selected={item.code === country.code}
                key={item.code}
                onClick={() => {
                  const digits = nationalNumber.slice(
                    0,
                    item.groups.reduce((total, size) => total + size, 0),
                  );
                  setSelectedCode(item.code);
                  setMenuOpen(false);
                  onChange(digits ? `${item.dialCode}${digits}` : '');
                }}
              >
                <CountryFlag code={item.code} />
                <span>{item.dialCode}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <input
        aria-label={phoneLabel}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={country.placeholder}
        value={formatNationalNumber(nationalNumber, country.groups)}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const digits = event.target.value
            .replace(/\D/g, '')
            .replace(/^0+/, '')
            .slice(0, maxLength);
          onChange(digits ? `${country.dialCode}${digits}` : '');
        }}
      />
    </div>
  );
}
