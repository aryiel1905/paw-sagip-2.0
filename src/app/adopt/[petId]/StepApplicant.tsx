"use client";

type Props = {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  socialProfile: string;
  setSocialProfile: (v: string) => void;
  civilStatus: "single" | "married" | "others" | "";
  setCivilStatus: (v: "single" | "married" | "others") => void;
  pronouns: "she/her" | "he/him" | "they/them" | "";
  setPronouns: (v: "she/her" | "he/him" | "they/them") => void;
  adoptedBefore: boolean | null;
  setAdoptedBefore: (v: boolean) => void;
  promptedBy: string[];
  setPromptedBy: (arr: string[]) => void;
};

export default function StepApplicant(props: Props) {
  const {
    firstName, setFirstName,
    lastName, setLastName,
    address, setAddress,
    phone, setPhone,
    email, setEmail,
    birthDate, setBirthDate,
    occupation, setOccupation,
    company, setCompany,
    socialProfile, setSocialProfile,
    civilStatus, setCivilStatus,
    pronouns, setPronouns,
    adoptedBefore, setAdoptedBefore,
    promptedBy, setPromptedBy,
  } = props;

  const togglePrompt = (val: string, checked: boolean) => {
    if (checked) {
      if (!promptedBy.includes(val)) setPromptedBy([...promptedBy, val]);
    } else {
      setPromptedBy(promptedBy.filter((v) => v !== val));
    }
  };

  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border-color)" }}>
      <div className="font-semibold ink-heading">Applicant's Info</div>
      <p className="ink-subtle text-xs">Fields marked with * are required</p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          First Name *
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
        </label>
        <label className="block text-sm">
          Last Name *
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={lastName} onChange={(e)=>setLastName(e.target.value)} />
        </label>
        <label className="block text-sm md:col-span-2">
          Address *
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={address} onChange={(e)=>setAddress(e.target.value)} />
        </label>
        <label className="block text-sm">
          Phone *
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </label>
        <label className="block text-sm">
          Email *
          <input type="email" className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={email} onChange={(e)=>setEmail(e.target.value)} />
        </label>
        <label className="block text-sm">
          Birth Date *
          <input type="date" className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} />
        </label>
        <div className="hidden md:block" />
        <label className="block text-sm">
          Occupation
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={occupation} onChange={(e)=>setOccupation(e.target.value)} />
        </label>
        <label className="block text-sm">
          Company/Business Name (Type N/A if unemployed) *
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={company} onChange={(e)=>setCompany(e.target.value)} />
        </label>
        <label className="block text-sm md:col-span-2">
          Social Media Profile (FB/Twitter/IG link or N/A)
          <input className="mt-1 w-full rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-color)" }} value={socialProfile} onChange={(e)=>setSocialProfile(e.target.value)} />
        </label>
        <label className="block text-sm">
          Status *
          <div className="mt-1 flex flex-wrap gap-4">
            {([
              { v: "single", t: "Single" },
              { v: "married", t: "Married" },
              { v: "others", t: "Others" },
            ] as const).map((o) => (
              <label key={o.v} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="status" checked={civilStatus===o.v} onChange={()=>setCivilStatus(o.v)} /> {o.t}
              </label>
            ))}
          </div>
        </label>
        <label className="block text-sm">
          Pronouns *
          <div className="mt-1 flex flex-wrap gap-4">
            {([
              { v: "she/her", t: "She/Her" },
              { v: "he/him", t: "He/Him" },
              { v: "they/them", t: "They/Them" },
            ] as const).map((o) => (
              <label key={o.v} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="pronouns" checked={pronouns===o.v} onChange={()=>setPronouns(o.v)} /> {o.t}
              </label>
            ))}
          </div>
        </label>
        <label className="block text-sm">
          Have you adopted from PawSagip before? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="adopted-before" checked={adoptedBefore===true} onChange={()=>setAdoptedBefore(true)} /> Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="adopted-before" checked={adoptedBefore===false} onChange={()=>setAdoptedBefore(false)} /> No
            </label>
          </div>
        </label>
        <label className="block text-sm md:col-span-2">
          What prompted you to adopt from PawSagip?
          <div className="mt-1 flex flex-wrap gap-4">
            {([
              { v: "friends", t: "Friends" },
              { v: "website", t: "Website" },
              { v: "social_media", t: "Social Media" },
              { v: "other", t: "Other" },
            ] as const).map((o) => (
              <label key={o.v} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={promptedBy.includes(o.v)} onChange={(e)=>togglePrompt(o.v, e.target.checked)} /> {o.t}
              </label>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}

