"use client";

type Props = {
  adoptWhat: "cat" | "dog" | "both" | "not_decided" | "";
  setAdoptWhat: (v: "cat" | "dog" | "both" | "not_decided") => void;
  specificShelterAnimal: boolean | null;
  setSpecificShelterAnimal: (v: boolean) => void;
  idealPet: string;
  setIdealPet: (v: string) => void;
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
};

export default function StepQuestionnaire(props: Props) {
  const {
    adoptWhat,
    setAdoptWhat,
    specificShelterAnimal,
    setSpecificShelterAnimal,
    idealPet,
    setIdealPet,
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
  } = props;

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
      <p className="ink-subtle text-xs">
        Help us match you with the right pet.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          What are you looking to adopt? *
          <div className="mt-1 flex flex-wrap gap-4">
            {(
              [
                { v: "cat", t: "Cat" },
                { v: "dog", t: "Dog" },
                { v: "both", t: "Both" },
                { v: "not_decided", t: "Not decided" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="adopt-what"
                  checked={adoptWhat === o.v}
                  onChange={() => setAdoptWhat(o.v)}
                />{" "}
                {o.t}
              </label>
            ))}
          </div>
        </label>
        <label className="block text-sm">
          Are you applying to adopt a specific shelter animal? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="specific-animal"
                checked={specificShelterAnimal === true}
                onChange={() => setSpecificShelterAnimal(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="specific-animal"
                checked={specificShelterAnimal === false}
                onChange={() => setSpecificShelterAnimal(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
        <label className="block text-sm md:col-span-2">
          Describe your ideal pet (sex, age, appearance, temperament, etc.)
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={idealPet}
            onChange={(e) => setIdealPet(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          What type of building do you live in? *
          <div className="mt-1 flex flex-wrap gap-4">
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
                />{" "}
                {o.t}
              </label>
            ))}
          </div>
        </label>
        <label className="block text-sm">
          Do you rent? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rents"
                checked={rents === true}
                onChange={() => setRents(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rents"
                checked={rents === false}
                onChange={() => setRents(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
        <label className="block text-sm md:col-span-2">
          What happens to your pet if/when you move?
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={movePlan}
            onChange={(e) => setMovePlan(e.target.value)}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          Who do you live with? *
          <div className="mt-1 flex flex-wrap gap-4">
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
                />{" "}
                {o.t}
              </label>
            ))}
          </div>
        </label>
        <label className="block text-sm">
          Are any household members allergic to animals? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allergies"
                checked={allergies === true}
                onChange={() => setAllergies(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allergies"
                checked={allergies === false}
                onChange={() => setAllergies(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
        <label className="block text-sm">
          Does everyone in the family support your decision? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="family-supports"
                checked={familySupports === true}
                onChange={() => setFamilySupports(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="family-supports"
                checked={familySupports === false}
                onChange={() => setFamilySupports(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
        <label className="block text-sm">
          Who will be responsible for daily care?
          <input
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={dailyCareBy}
            onChange={(e) => setDailyCareBy(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Who will be financially responsible (food, vet bills, etc.)?
          <input
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={financialResponsible}
            onChange={(e) => setFinancialResponsible(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Who will look after your pet during vacation/emergencies?
          <input
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={vacationCaregiver}
            onChange={(e) => setVacationCaregiver(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          How many hours on a workday will your pet be left alone?
          <input
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={hoursAlone}
            onChange={(e) => setHoursAlone(e.target.value)}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          What steps will you take to introduce your pet to new surroundings?
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            value={introSteps}
            onChange={(e) => setIntroSteps(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Do you have other pets? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="has-pets-now"
                checked={hasPetsNow === true}
                onChange={() => setHasPetsNow(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="has-pets-now"
                checked={hasPetsNow === false}
                onChange={() => setHasPetsNow(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
        <label className="block text-sm">
          Have you had pets in the past? *
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="had-pets-past"
                checked={hadPetsPast === true}
                onChange={() => setHadPetsPast(true)}
              />{" "}
              Yes
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="had-pets-past"
                checked={hadPetsPast === false}
                onChange={() => setHadPetsPast(false)}
              />{" "}
              No
            </label>
          </div>
        </label>
      </div>
    </div>
  );
}
