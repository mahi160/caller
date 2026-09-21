// Patches the freshly-prebuilt android/app/build.gradle so `assembleRelease`
// signs with a real release keystore instead of Expo's default debug.keystore.
// Run this after `expo prebuild` and before `./gradlew assembleRelease`.
// Reads the keystore path/passwords from android/keystore.properties (see
// .github/workflows/release.yml for how that file gets written in CI).
const fs = require('node:fs');
const path = require('node:path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let src = fs.readFileSync(gradlePath, 'utf8');

if (src.includes('signingConfigs.release')) {
  console.log('build.gradle already patched, skipping');
  process.exit(0);
}

const loadProps = `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;
src = loadProps + src;

src = src.replace(
  /signingConfigs \{\n( {8}debug \{[\s\S]*?\n {8}\}\n)/,
  `signingConfigs {\n$1        release {
            storeFile file(keystoreProperties['storeFile'] ?: 'debug.keystore')
            storePassword keystoreProperties['storePassword'] ?: 'android'
            keyAlias keystoreProperties['keyAlias'] ?: 'androiddebugkey'
            keyPassword keystoreProperties['keyPassword'] ?: 'android'
        }\n`
);

src = src.replace(
  /(release \{\n(?:.*\n)*? {12}signingConfig signingConfigs\.)debug/,
  '$1release'
);

if (!src.includes('signingConfigs.release')) {
  throw new Error('patch-android-signing: failed to patch build.gradle (Expo template format may have changed)');
}

fs.writeFileSync(gradlePath, src);
console.log('Patched build.gradle for release signing');
