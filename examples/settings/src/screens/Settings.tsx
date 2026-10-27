import { useNavigation } from "tvml-react";

import { FormScreen } from "../components/FormScreen";
import { ToggleRow, ValueRow } from "../components/Rows";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  labelFor,
  QUALITY_OPTIONS,
  SUBTITLE_OPTIONS,
  usePreferences,
  useProfile,
} from "../store";
import { validateEmail, validateName, validatePin } from "../validation";
import { ConfirmAlert } from "./ConfirmAlert";
import { GenrePicker } from "./GenrePicker";
import { OptionPicker } from "./OptionPicker";
import { RateApp, stars } from "./RateApp";

export function Settings() {
  const navigation = useNavigation();
  const [profile, updateProfile, setProfile] = useProfile();
  const [prefs, updatePrefs, setPrefs] = usePreferences();

  const editName = () =>
    navigation.push(
      <FormScreen
        title="Name"
        hint="This is how you'll appear on this Apple TV."
        placeholder="Your name"
        initialValue={profile.name}
        validate={validateName}
        submitLabel="Save"
        onSubmit={(name) => {
          updateProfile({ name });
          navigation.pop();
        }}
      />,
    );

  const editEmail = () =>
    navigation.push(
      <FormScreen
        title="Email"
        hint="Receipts and account notices go here."
        placeholder="name@example.com"
        keyboardType="emailAddress"
        initialValue={profile.email}
        validate={validateEmail}
        submitLabel="Save"
        onSubmit={(email) => {
          updateProfile({ email: email.toLowerCase() });
          navigation.pop();
        }}
      />,
    );

  const editPin = () => {
    if (profile.pin) {
      navigation.presentModal(
        <ConfirmAlert
          title="Turn off parental PIN?"
          message="Anyone using this Apple TV will be able to watch everything."
          confirmLabel="Turn Off"
          onConfirm={() => updateProfile({ pin: "" })}
        />,
      );
      return;
    }
    navigation.push(
      <FormScreen
        title="Create a parental PIN"
        hint="Required to watch anything rated above your restriction level."
        placeholder="4 digits"
        keyboardType="numberPad"
        secure
        validate={validatePin}
        submitLabel="Set PIN"
        onSubmit={(pin) => {
          updateProfile({ pin });
          navigation.pop();
        }}
      />,
    );
  };

  const confirmReset = () =>
    navigation.presentModal(
      <ConfirmAlert
        title="Reset all settings?"
        message="Playback and display preferences go back to their defaults. Your profile is kept."
        confirmLabel="Reset"
        onConfirm={() => setPrefs(DEFAULT_PREFERENCES)}
      />,
    );

  const confirmSignOut = () =>
    navigation.presentModal(
      <ConfirmAlert
        title={`Sign out ${profile.name}?`}
        message="Your profile, PIN and favorite genres will be removed from this Apple TV."
        confirmLabel="Sign Out"
        onConfirm={() => {
          setProfile(DEFAULT_PROFILE);
          setPrefs(DEFAULT_PREFERENCES);
        }}
      />,
    );

  const genreCount = profile.genres.length;

  return (
    <listTemplate theme="dark">
      <banner>
        <title>Settings</title>
      </banner>
      <list>
        <section>
          <header>
            <title>Account</title>
          </header>
          <ValueRow title="Name" value={profile.name} about="How you appear on this Apple TV." onSelect={editName} />
          <ValueRow title="Email" value={profile.email} about="Receipts and account notices." onSelect={editEmail} />
          <ValueRow
            title="Parental PIN"
            value={profile.pin ? "On" : "Off"}
            about="Ask for a PIN before playing restricted content."
            onSelect={editPin}
          />
          {profile.pin ? (
            <ToggleRow
              title="Require PIN for Purchases"
              value={prefs.pinForPurchases}
              about="Ask for your PIN before buying or renting."
              onSelect={() => updatePrefs({ pinForPurchases: !prefs.pinForPurchases })}
            />
          ) : null}
        </section>
        <section>
          <header>
            <title>Playback</title>
          </header>
          <ToggleRow
            title="Autoplay Next Episode"
            value={prefs.autoplay}
            about="Start the next episode automatically when one ends."
            onSelect={() => updatePrefs({ autoplay: !prefs.autoplay })}
          />
          <ToggleRow
            title="Autoplay Previews"
            value={prefs.previews}
            about="Play trailers while you browse."
            onSelect={() => updatePrefs({ previews: !prefs.previews })}
          />
          <ToggleRow
            title="Reduce Loud Sounds"
            value={prefs.reduceLoudness}
            about="Narrow the dynamic range so explosions don't wake the house."
            onSelect={() => updatePrefs({ reduceLoudness: !prefs.reduceLoudness })}
          />
          <ValueRow
            title="Subtitles"
            value={labelFor(SUBTITLE_OPTIONS, prefs.subtitles)}
            about="Language for subtitles and captions."
            onSelect={() =>
              navigation.push(
                <OptionPicker
                  title="Subtitles"
                  options={SUBTITLE_OPTIONS}
                  value={prefs.subtitles}
                  onChange={(subtitles) => updatePrefs({ subtitles })}
                />,
              )
            }
          />
          <ValueRow
            title="Video Quality"
            value={labelFor(QUALITY_OPTIONS, prefs.quality)}
            about="Higher quality uses more data."
            onSelect={() =>
              navigation.push(
                <OptionPicker
                  title="Video Quality"
                  options={QUALITY_OPTIONS}
                  value={prefs.quality}
                  onChange={(quality) => updatePrefs({ quality })}
                />,
              )
            }
          />
        </section>
        <section>
          <header>
            <title>Personalization</title>
          </header>
          <ValueRow
            title="Favorite Genres"
            value={genreCount === 0 ? "None" : `${genreCount} selected`}
            about="We use these to tune your recommendations."
            onSelect={() => navigation.push(<FavoriteGenres />)}
          />
          <ValueRow
            title="Rate Couch"
            value={stars(prefs.rating)}
            about="Tell us how we're doing."
            onSelect={() => navigation.push(<RateApp />)}
          />
        </section>
        <section>
          <ValueRow title="Reset All Settings" about="Put playback preferences back to their defaults." onSelect={confirmReset} />
          <ValueRow title="Sign Out" about="Remove your profile from this Apple TV." onSelect={confirmSignOut} />
        </section>
      </list>
    </listTemplate>
  );
}

// A component (not an inline element) so it reads the live profile: elements
// passed to navigation.push() keep the props they were created with.
function FavoriteGenres() {
  const navigation = useNavigation();
  const [profile, , , toggleGenre] = useProfile();
  return (
    <GenrePicker
      title="Favorite Genres"
      selected={profile.genres}
      onToggle={toggleGenre}
      doneLabel="Done"
      onDone={() => navigation.pop()}
    />
  );
}
