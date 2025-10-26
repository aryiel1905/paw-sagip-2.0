"use client";

type Props = {
  adoptWhat: "cat" | "dog" | "";
  setAdoptWhat: (v: "cat" | "dog" | "") => void;
  lockAdoptWhat?: boolean;
  homeType: "house" | "apartment" | "condo" | "other" | "";
  setHomeType: (v: "house" | "apartment" | "condo" | "other") => void;
  rents: boolean | null;
  setRents: (v: boolean) => void;
  movePlan: string;
  setMovePlan: (v: string) => void;
  liveWith: string[];
  setLiveWith: (arr: string[]) => void;
  allergies: boolean | null;
  setAllergies: (v: boolean) => void;
  familySupports: boolean | null;
  setFamilySupports: (v: boolean) => void;
  dailyCareBy: string;
  setDailyCareBy: (v: string) => void;
  financialResponsible: string;
  setFinancialResponsible: (v: string) => void;
  vacationCaregiver: string;
  setVacationCaregiver: (v: string) => void;
  hoursAlone: string;
  setHoursAlone: (v: string) => void;
  introSteps: string;
  setIntroSteps: (v: string) => void;
  hasPetsNow: boolean | null;
  setHasPetsNow: (v: boolean) => void;
  hadPetsPast: boolean | null;
  setHadPetsPast: (v: boolean) => void;
  showErrors?: boolean;
};

export default function StepQuestionnaire({
  adoptWhat,
  setAdoptWhat,
  lockAdoptWhat = false,
  homeType,
  setHomeType,
  rents,
  setRents,
  movePlan,
  setMovePlan,
  liveWith,
  setLiveWith,
  allergies,
  setAllergies,
  familySupports,
  setFamilySupports,
  dailyCareBy,
  setDailyCareBy,
  financialResponsible,
  setFinancialResponsible,
  vacationCaregiver,
  setVacationCaregiver,
  hoursAlone,
  setHoursAlone,
  introSteps,
  setIntroSteps,
  hasPetsNow,
  setHasPetsNow,
  hadPetsPast,
  setHadPetsPast,
  showErrors = false,
}: Props) {
  const adoptWhatError = showErrors && !adoptWhat;
  const homeTypeError = showErrors && !homeType;
  const rentsError = showErrors && rents === null;
  const liveWithError = showErrors && liveWith.length === 0;
  const allergiesError = showErrors && allergies === null;
  const familySupportsError = showErrors && familySupports === null;
  const hasPetsNowError = showErrors && hasPetsNow === null;
  const hadPetsPastError = showErrors && hadPetsPast === null;

  const requiredMark = <span className="text-red-500">*</span>;

  const choiceGroupClass = (hasError: boolean) =>
    `mt-1 flex flex-wrap gap-4 rounded-xl border px-3 py-2 ${
      hasError
        ? "border-red-500 ring-1 ring-red-400"
        : "border-[var(--border-color)]"
    }`;

  const toggleLiveWith = (val: string, checked: boolean) => {
    if (checked) {
      if (!liveWith.includes(val)) setLiveWith([...liveWith, val]);
    } else {
      setLiveWith(liveWith.filter((v) => v !== val));
    }
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ border: "1px solid var(--border-color)" }}
    >
      <div className="font-semibold ink-heading">Questionnaire</div>
      <p className="ink-subtle text-xs">Fields marked with * are required</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          What are you looking to adopt? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={adoptWhatError}
            aria-describedby={adoptWhatError ? "adopt-what-error" : undefined}
            className={choiceGroupClass(adoptWhatError)}
          >
            {(
              [
                { v: "cat", t: "Cat" },
                { v: "dog", t: "Dog" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="adopt-what"
                  disabled={lockAdoptWhat}
                  checked={adoptWhat === o.v}
                  onChange={() => setAdoptWhat(o.v)}
                />
                {o.t}
              </label>
            ))}
          </div>
          {adoptWhatError ? (
            <p id="adopt-what-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          Do you rent? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={rentsError}
            aria-describedby={rentsError ? "rents-error" : undefined}
            className={choiceGroupClass(rentsError)}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rents"
                checked={rents === true}
                onChange={() => setRents(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rents"
                checked={rents === false}
                onChange={() => setRents(false)}
              />
              No
            </label>
          </div>
          {rentsError ? (
            <p id="rents-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm col-span-2">
          What type of building do you live in? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={homeTypeError}
            aria-describedby={homeTypeError ? "home-type-error" : undefined}
            className={choiceGroupClass(homeTypeError)}
          >
            {(
              [
                { v: "house", t: "House" },
                { v: "apartment", t: "Apartment" },
                { v: "condo", t: "Condo" },
                { v: "other", t: "Other" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="home-type"
                  checked={homeType === o.v}
                  onChange={() => setHomeType(o.v)}
                />
                {o.t}
              </label>
            ))}
          </div>
          {homeTypeError ? (
            <p id="home-type-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm md:col-span-2">
          What happens to your pet if/when you move?
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={movePlan}
            onChange={(e) => setMovePlan(e.target.value)}
          />
        </label>

        <label className="block text-sm md:col-span-2">
          Who do you live with? {requiredMark}
          <div
            role="group"
            aria-invalid={liveWithError}
            aria-describedby={liveWithError ? "live-with-error" : undefined}
            className={choiceGroupClass(liveWithError)}
          >
            {(
              [
                { v: "living_alone", t: "Living alone" },
                { v: "spouse", t: "Spouse" },
                { v: "parents", t: "Parents" },
                { v: "children_over_18", t: "Children over 18" },
                { v: "children_below_18", t: "Children below 18" },
                { v: "relatives", t: "Relatives" },
                { v: "roommates", t: "Roommates" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={liveWith.includes(o.v)}
                  onChange={(e) => toggleLiveWith(o.v, e.target.checked)}
                />
                {o.t}
              </label>
            ))}
          </div>
          {liveWithError ? (
            <p id="live-with-error" className="mt-1 text-xs text-red-500">
              Please select at least one option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          Are any household members allergic to animals? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={allergiesError}
            aria-describedby={allergiesError ? "allergies-error" : undefined}
            className={choiceGroupClass(allergiesError)}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allergies"
                checked={allergies === true}
                onChange={() => setAllergies(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allergies"
                checked={allergies === false}
                onChange={() => setAllergies(false)}
              />
              No
            </label>
          </div>
          {allergiesError ? (
            <p id="allergies-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          Does everyone in the family support your decision? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={familySupportsError}
            aria-describedby={
              familySupportsError ? "family-supports-error" : undefined
            }
            className={choiceGroupClass(familySupportsError)}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="family-supports"
                checked={familySupports === true}
                onChange={() => setFamilySupports(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="family-supports"
                checked={familySupports === false}
                onChange={() => setFamilySupports(false)}
              />
              No
            </label>
          </div>
          {familySupportsError ? (
            <p id="family-supports-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          Who will be responsible for daily care?
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={dailyCareBy}
            onChange={(e) => setDailyCareBy(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Who will be financially responsible (food, vet bills, etc.)?
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={financialResponsible}
            onChange={(e) => setFinancialResponsible(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Who will look after your pet during vacation/emergencies?
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={vacationCaregiver}
            onChange={(e) => setVacationCaregiver(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          How many hours on a workday will your pet be left alone?
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={hoursAlone}
            onChange={(e) => setHoursAlone(e.target.value)}
          />
        </label>

        <label className="block text-sm md:col-span-2">
          What steps will you take to introduce your pet to new surroundings?
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
            value={introSteps}
            onChange={(e) => setIntroSteps(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Do you have other pets? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={hasPetsNowError}
            aria-describedby={
              hasPetsNowError ? "has-pets-now-error" : undefined
            }
            className={choiceGroupClass(hasPetsNowError)}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="has-pets-now"
                checked={hasPetsNow === true}
                onChange={() => setHasPetsNow(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="has-pets-now"
                checked={hasPetsNow === false}
                onChange={() => setHasPetsNow(false)}
              />
              No
            </label>
          </div>
          {hasPetsNowError ? (
            <p id="has-pets-now-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          Have you had pets in the past? {requiredMark}
          <div
            role="radiogroup"
            aria-invalid={hadPetsPastError}
            aria-describedby={
              hadPetsPastError ? "had-pets-past-error" : undefined
            }
            className={choiceGroupClass(hadPetsPastError)}
          >
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="had-pets-past"
                checked={hadPetsPast === true}
                onChange={() => setHadPetsPast(true)}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="had-pets-past"
                checked={hadPetsPast === false}
                onChange={() => setHadPetsPast(false)}
              />
              No
            </label>
          </div>
          {hadPetsPastError ? (
            <p id="had-pets-past-error" className="mt-1 text-xs text-red-500">
              Please select an option.
            </p>
          ) : null}
        </label>
      </div>
    </div>
  );
}
