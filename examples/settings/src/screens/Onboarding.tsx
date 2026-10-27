import { useNavigation } from "tvml-react";

import { FormScreen } from "../components/FormScreen";
import { useProfile } from "../store";
import { validateEmail, validateName, validatePin } from "../validation";
import { GenrePicker } from "./GenrePicker";

// Onboarding is a stack of pushed screens. Each step writes straight to the
// persisted profile, so quitting halfway and coming back resumes with the
// fields filled in. `onboarded` only flips on the last step.

export function Welcome() {
  const navigation = useNavigation();
  const [profile] = useProfile();
  const resuming = profile.name !== "";
  return (
    <alertTemplate theme="dark">
      <title>{resuming ? `Welcome back, ${profile.name}` : "Welcome to Couch"}</title>
      <description>
        {resuming
          ? "Pick up where you left off. It only takes a minute."
          : "Set up your profile, choose what you like to watch, and we'll do the rest."}
      </description>
      <button onSelect={() => navigation.push(<NameStep />)}>
        <text>{resuming ? "Continue Setup" : "Get Started"}</text>
      </button>
    </alertTemplate>
  );
}

export function NameStep() {
  const navigation = useNavigation();
  const [profile, update] = useProfile();
  return (
    <FormScreen
      title="What should we call you?"
      hint="This is how you'll appear on this Apple TV."
      placeholder="Your name"
      initialValue={profile.name}
      validate={validateName}
      validMessage={(name) => `Nice to meet you, ${name}.`}
      submitLabel="Continue"
      onSubmit={(name) => {
        update({ name });
        navigation.push(<EmailStep />);
      }}
    />
  );
}

export function EmailStep() {
  const navigation = useNavigation();
  const [profile, update] = useProfile();
  return (
    <FormScreen
      title="Your email address"
      hint="We'll send your receipts and account notices here."
      placeholder="name@example.com"
      keyboardType="emailAddress"
      initialValue={profile.email}
      validate={validateEmail}
      validMessage={() => "Looks good."}
      submitLabel="Continue"
      onSubmit={(email) => {
        update({ email: email.toLowerCase() });
        navigation.push(<PinStep />);
      }}
    />
  );
}

export function PinStep() {
  const navigation = useNavigation();
  const [, update] = useProfile();
  const next = () => navigation.push(<GenresStep />);
  return (
    <FormScreen
      title="Create a parental PIN"
      hint="Required to watch anything rated above your restriction level."
      placeholder="4 digits"
      keyboardType="numberPad"
      secure
      validate={validatePin}
      submitLabel="Set PIN"
      onSubmit={(pin) => {
        update({ pin });
        next();
      }}
      secondary={
        <button onSelect={next}>
          <text>Not Now</text>
        </button>
      }
    />
  );
}

export function GenresStep() {
  const navigation = useNavigation();
  const [profile, , , toggleGenre] = useProfile();
  return (
    <GenrePicker
      title="What do you like to watch?"
      selected={profile.genres}
      onToggle={toggleGenre}
      doneLabel="Continue"
      onDone={() => navigation.push(<DoneStep />)}
    />
  );
}

export function DoneStep() {
  const navigation = useNavigation();
  const [profile, update] = useProfile();
  const genres = profile.genres;
  return (
    <alertTemplate theme="dark">
      <title>{`You're all set, ${profile.name}`}</title>
      <description>
        {genres.length > 0
          ? `We'll start with ${listFormat(genres.slice(0, 3))}${genres.length > 3 ? " and more" : ""}.`
          : "We'll learn what you like as you watch."}
      </description>
      <button
        onSelect={() => {
          // The root screen renders <Settings> once onboarded is true; pop the
          // onboarding stack so it's what's left on screen.
          update({ onboarded: true });
          navigation.popToRoot();
        }}
      >
        <text>Start Watching</text>
      </button>
    </alertTemplate>
  );
}

function listFormat(items: ReadonlyArray<string>): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
