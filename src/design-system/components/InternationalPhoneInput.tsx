import { useState } from 'react';

const countries = [
  { code: 'FR', dialCode: '+33', label: 'France' },
  { code: 'TN', dialCode: '+216', label: 'Tunisie' },
  { code: 'BE', dialCode: '+32', label: 'Belgique' },
  { code: 'CH', dialCode: '+41', label: 'Suisse' },
  { code: 'MA', dialCode: '+212', label: 'Maroc' },
  { code: 'DZ', dialCode: '+213', label: 'Algérie' },
] as const;

type Country = (typeof countries)[number];

function findCountry(value: string): Country {
  return (
    [...countries]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => value.startsWith(country.dialCode)) ?? countries[0]
  );
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
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  countryLabel: string;
  phoneLabel: string;
  disabled?: boolean;
}) {
  const detectedCountry = findCountry(value);
  const [selectedCode, setSelectedCode] = useState<Country['code']>(detectedCountry.code);
  const country = countries.find((item) => item.code === selectedCode) ?? detectedCountry;
  const nationalNumber = value.startsWith(country.dialCode)
    ? value.slice(country.dialCode.length)
    : value.replace(/^\+/, '');

  return (
    <div className="international-phone-input">
      <div className="phone-country-control">
        <CountryFlag code={country.code} />
        <select
          aria-label={countryLabel}
          value={country.code}
          disabled={disabled}
          onChange={(event) => {
            const next = countries.find((item) => item.code === event.target.value) ?? countries[0];
            setSelectedCode(next.code);
            onChange(nationalNumber ? `${next.dialCode}${nationalNumber}` : '');
          }}
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label} {item.dialCode}
            </option>
          ))}
        </select>
      </div>
      <span className="phone-dial-code" aria-hidden="true">
        {country.dialCode}
      </span>
      <input
        aria-label={phoneLabel}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="6 12 34 56 78"
        value={nationalNumber}
        disabled={disabled}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '');
          onChange(digits ? `${country.dialCode}${digits}` : '');
        }}
      />
    </div>
  );
}
