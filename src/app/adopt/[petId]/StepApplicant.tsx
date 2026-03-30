"use client";

import { useEffect, useRef } from "react";

type Props = {
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  emailLocked?: boolean;
  birthDate: string;
  setBirthDate: (value: string) => void;
  occupation: string;
  setOccupation: (value: string) => void;
  company: string;
  setCompany: (value: string) => void;
  socialProfile: string;
  setSocialProfile: (value: string) => void;
  civilStatus: "single" | "married" | "others" | "";
  setCivilStatus: (value: "single" | "married" | "others" | "") => void;
  pronouns: "she/her" | "he/him" | "they/them" | "";
  setPronouns: (value: "she/her" | "he/him" | "they/them" | "") => void;
  adoptedBefore: boolean | null;
  setAdoptedBefore: (value: boolean | null) => void;
  idDocumentType: string;
  setIdDocumentType: (value: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (file: File | null) => void;
  idDocumentPreviewUrl: string | null;
  setIdDocumentPreviewUrl: (url: string | null) => void;
  showErrors?: boolean;
};

export default function StepApplicant({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  address,
  setAddress,
  phone,
  setPhone,
  email,
  setEmail,
  emailLocked = false,
  birthDate,
  setBirthDate,
  occupation,
  setOccupation,
  company,
  setCompany,
  socialProfile,
  setSocialProfile,
  civilStatus,
  setCivilStatus,
  pronouns,
  setPronouns,
  adoptedBefore,
  setAdoptedBefore,
  idDocumentType,
  setIdDocumentType,
  idDocumentFile,
  setIdDocumentFile,
  idDocumentPreviewUrl,
  setIdDocumentPreviewUrl,
  showErrors = false,
}: Props) {
  const firstNameError = showErrors && !firstName.trim();
  const lastNameError = showErrors && !lastName.trim();
  const addressError = showErrors && !address.trim();
  const phoneError = showErrors && !phone.trim();
  const emailError = showErrors && !email.trim();
  const birthDateError = showErrors && !birthDate;
  const civilStatusError = showErrors && !civilStatus;
  const pronounsError = showErrors && !pronouns;
  const adoptedBeforeError = showErrors && adoptedBefore === null;
  const idDocumentTypeError = showErrors && !idDocumentType.trim();
  const idDocumentFileError = showErrors && !idDocumentFile;

  const requiredMark = <span className="text-red-500">*</span>;

  const inputClass = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border px-3 py-2 focus-visible:outline-none ${
      hasError
        ? "border-red-500 focus-visible:ring-2 focus-visible:ring-red-400"
        : "border-[var(--border-color)] focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
    }`;

  const idInputRef = useRef<HTMLInputElement | null>(null);

  const handleIdDocumentChange = (file: File | null) => {
    if (idDocumentPreviewUrl) {
      try {
        URL.revokeObjectURL(idDocumentPreviewUrl);
      } catch {}
    }
    setIdDocumentFile(file);
    if (file) {
      const preview = URL.createObjectURL(file);
      setIdDocumentPreviewUrl(preview);
    } else {
      setIdDocumentPreviewUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (idDocumentPreviewUrl) {
        try {
          URL.revokeObjectURL(idDocumentPreviewUrl);
        } catch {}
      }
    };
  }, [idDocumentPreviewUrl]);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ border: "1px solid var(--border-color)" }}
    >
      <div className="font-semibold ink-heading">Applicant&apos;s Info</div>
      <p className="ink-subtle text-xs">Fields marked with * are required</p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="first-name"
          >
            First Name {requiredMark}
          </label>
          <input
            id="first-name"
            className={inputClass(firstNameError)}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={firstNameError}
            aria-describedby={firstNameError ? "first-name-error" : undefined}
          />
          {firstNameError ? (
            <p id="first-name-error" className="mt-1 text-xs text-red-500">
              First name is required.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="last-name"
          >
            Last Name {requiredMark}
          </label>
          <input
            id="last-name"
            className={inputClass(lastNameError)}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-invalid={lastNameError}
            aria-describedby={lastNameError ? "last-name-error" : undefined}
          />
          {lastNameError ? (
            <p id="last-name-error" className="mt-1 text-xs text-red-500">
              Last name is required.
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="address"
          >
            Address {requiredMark}
          </label>
          <input
            id="address"
            className={inputClass(addressError)}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            aria-invalid={addressError}
            aria-describedby={addressError ? "address-error" : undefined}
          />
          {addressError ? (
            <p id="address-error" className="mt-1 text-xs text-red-500">
              Address is required.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="phone"
          >
            Phone {requiredMark}
          </label>
          <input
            id="phone"
            className={inputClass(phoneError)}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneError}
            aria-describedby={phoneError ? "phone-error" : undefined}
          />
          {phoneError ? (
            <p id="phone-error" className="mt-1 text-xs text-red-500">
              Phone number is required.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="email"
          >
            Email {requiredMark}
          </label>
          <input
            id="email"
            type="email"
            className={inputClass(emailError)}
            value={email}
            onChange={(e) => {
              if (!emailLocked) setEmail(e.target.value);
            }}
            readOnly={emailLocked}
            aria-invalid={emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            title={emailLocked ? "Email is locked to your account." : undefined}
          />
          {emailLocked ? (
            <p className="mt-1 text-xs ink-muted">
              This email is locked to your signed-in account.
            </p>
          ) : null}
          {emailError ? (
            <p id="email-error" className="mt-1 text-xs text-red-500">
              Email is required.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="birth-date"
          >
            Birth Date {requiredMark}
          </label>
          <input
            id="birth-date"
            type="date"
            className={inputClass(birthDateError)}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-invalid={birthDateError}
            aria-describedby={birthDateError ? "birth-date-error" : undefined}
          />
          {birthDateError ? (
            <p id="birth-date-error" className="mt-1 text-xs text-red-500">
              Birth date is required.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="occupation"
          >
            Occupation
          </label>
          <input
            id="occupation"
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium ink-heading"
            htmlFor="social-profile"
          >
            Social Media Profile (FB/Twitter/IG link or N/A)
          </label>
          <input
            id="social-profile"
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={socialProfile}
            onChange={(e) => setSocialProfile(e.target.value)}
          />
        </div>

        <div>
          <span className="block text-sm font-medium ink-heading">
            Status {requiredMark}
          </span>
          <div
            role="radiogroup"
            aria-invalid={civilStatusError}
            aria-describedby={
              civilStatusError ? "civil-status-error" : undefined
            }
            className={`mt-1 flex flex-wrap gap-4 rounded-xl border px-3 py-2 ${
              civilStatusError
                ? "border-red-500 ring-1 ring-red-400"
                : "border-[var(--border-color)]"
            }`}
          >
            {(
              [
                { v: "single", t: "Single" },
                { v: "married", t: "Married" },
                { v: "others", t: "Others" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="status"
                  checked={civilStatus === o.v}
                  onChange={() =>
                    setCivilStatus(o.v as "single" | "married" | "others")
                  }
                />
                {o.t}
              </label>
            ))}
          </div>
          {civilStatusError ? (
            <p id="civil-status-error" className="mt-1 text-xs text-red-500">
              Please select your status.
            </p>
          ) : null}
        </div>

        <div>
          <span className="block text-sm font-medium ink-heading">
            Pronouns {requiredMark}
          </span>
          <div
            role="radiogroup"
            aria-invalid={pronounsError}
            aria-describedby={pronounsError ? "pronouns-error" : undefined}
            className={`mt-1 flex flex-wrap gap-4 rounded-xl border px-3 py-2 ${
              pronounsError
                ? "border-red-500 ring-1 ring-red-400"
                : "border-[var(--border-color)]"
            }`}
          >
            {(
              [
                { v: "she/her", t: "She/Her" },
                { v: "he/him", t: "He/Him" },
                { v: "they/them", t: "They/Them" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="pronouns"
                  checked={pronouns === o.v}
                  onChange={() =>
                    setPronouns(o.v as "she/her" | "he/him" | "they/them")
                  }
                />
                {o.t}
              </label>
            ))}
          </div>
          {pronounsError ? (
            <p id="pronouns-error" className="mt-1 text-xs text-red-500">
              Please select your pronouns.
            </p>
          ) : null}
        </div>

        <div>
          <span className="block text-sm font-medium ink-heading">
            Have you adopted from PawSagip before? {requiredMark}
          </span>
          <div
            role="radiogroup"
            aria-invalid={adoptedBeforeError}
            aria-describedby={
              adoptedBeforeError ? "adopted-before-error" : undefined
            }
            className={`mt-1 flex flex-wrap gap-4 rounded-xl border px-3 py-2 ${
              adoptedBeforeError
                ? "border-red-500 ring-1 ring-red-400"
                : "border-[var(--border-color)]"
            }`}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="adopted-before"
                checked={adoptedBefore === true}
                onChange={() => setAdoptedBefore(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="adopted-before"
                checked={adoptedBefore === false}
                onChange={() => setAdoptedBefore(false)}
              />
              No
            </label>
          </div>
          {adoptedBeforeError ? (
            <p id="adopted-before-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </div>

        <div className="hidden md:block" />
      </div>

      <div
        className="md:col-span-2 mt-6 rounded-2xl border p-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3 className="font-semibold ink-heading mb-1">
          Identity Verification {requiredMark}
        </h3>
        <p className="text-xs ink-subtle">
          Please provide a valid government-issued ID or document so our team
          can verify your identity.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium ink-heading">
              Document Type {requiredMark}
            </label>
            <select
              className={inputClass(idDocumentTypeError)}
              value={idDocumentType}
              onChange={(e) => setIdDocumentType(e.target.value)}
              aria-invalid={idDocumentTypeError}
            >
              <option value="">Select document</option>
              <option value="Driver's License">Driver&apos;s License</option>
              <option value="National ID">National ID</option>
              <option value="Passport">Passport</option>
              <option value="Student ID">Student ID</option>
              <option value="Other">Other</option>
            </select>
            {idDocumentTypeError ? (
              <p className="mt-1 text-xs text-red-500">
                Please select a document type.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium ink-heading">
              Document Upload {requiredMark}
            </label>
            <div
              className="mt-1 rounded-xl border px-3 py-3 flex flex-col gap-2 items-start"
              style={{ borderColor: idDocumentFileError ? "#ef4444" : "var(--border-color)" }}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                ref={idInputRef}
                onChange={(e) =>
                  handleIdDocumentChange(e.target.files?.[0] ?? null)
                }
              />
              {!idDocumentFile ? (
                <>
                  <p className="text-sm ink-muted">
                    Take a photo or upload a clear copy of your ID.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-1 text-sm"
                    onClick={() => idInputRef.current?.click()}
                  >
                    Upload document
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center gap-3">
                  {idDocumentPreviewUrl && idDocumentFile.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={idDocumentPreviewUrl}
                      alt="Document preview"
                      className="h-20 w-32 object-cover rounded-lg border"
                      style={{ borderColor: "var(--border-color)" }}
                    />
                  ) : (
                    <div className="flex-1 text-sm ink-heading">
                      {idDocumentFile.name} ({idDocumentFile.type || "file"})
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="pill px-3 py-1 text-sm"
                      style={{ border: "1px solid var(--border-color)" }}
                      onClick={() => idInputRef.current?.click()}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="pill px-3 py-1 text-sm"
                      style={{ border: "1px solid var(--border-color)" }}
                      onClick={() => handleIdDocumentChange(null)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs ink-subtle mt-1">
              Accepted: JPG, PNG, or PDF. Max 8 MB.
            </p>
            {idDocumentFileError ? (
              <p className="mt-1 text-xs text-red-500">
                Please upload a valid ID or document.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
  
