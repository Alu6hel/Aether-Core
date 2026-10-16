#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
SDK="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
BUILD_TOOLS="$SDK/build-tools/36.1.0"
PLATFORM="$SDK/platforms/android-36/android.jar"
DIST="$ROOT/dist"

echo "[APK BUILD] Starting Aether-Core Android APK build..."

# 1. Sync latest web assets into assets/
echo "[APK BUILD] Syncing game assets..."
mkdir -p "$DIR/assets/engine" "$DIR/assets/assets" "$DIST"
cp "$ROOT/index.html" "$DIR/assets/"
cp "$ROOT/styles.css" "$DIR/assets/"
cp "$ROOT/main.js" "$DIR/assets/"
cp -r "$ROOT/engine/"* "$DIR/assets/engine/"
cp -r "$ROOT/assets/"* "$DIR/assets/assets/"

# 2. Compile resources with aapt2
echo "[APK BUILD] Compiling resources..."
mkdir -p "$DIR/build/obj" "$DIR/build/gen"
"$BUILD_TOOLS/aapt2" compile --dir "$DIR/res" -o "$DIR/build/compiled_res.zip"

# 3. Link resources and bundle assets
echo "[APK BUILD] Linking resources and assets..."
"$BUILD_TOOLS/aapt2" link -I "$PLATFORM" "$DIR/build/compiled_res.zip" \
  --manifest "$DIR/AndroidManifest.xml" \
  -o "$DIR/build/unaligned.apk" \
  --java "$DIR/build/gen" \
  -A "$DIR/assets"

# 4. Compile Java classes
echo "[APK BUILD] Compiling Java source..."
javac -cp "$PLATFORM" -source 11 -target 11 -d "$DIR/build/obj" \
  "$DIR/build/gen/com/alumungandr/aethercore/R.java" \
  "$DIR/src/com/alumungandr/aethercore/MainActivity.java"

# 5. Convert to Dalvik DEX
echo "[APK BUILD] Generating classes.dex with D8..."
"$BUILD_TOOLS/d8" "$DIR/build/obj/com/alumungandr/aethercore/"*.class --lib "$PLATFORM" --output "$DIR/build/"

# 6. Add classes.dex to APK
(cd "$DIR/build" && zip -u unaligned.apk classes.dex)

# 7. Zipalign
echo "[APK BUILD] Zipaligning APK..."
rm -f "$DIST/aether-core.apk"
"$BUILD_TOOLS/zipalign" -v -p 4 "$DIR/build/unaligned.apk" "$DIST/aether-core.apk" > /dev/null

# 8. Sign APK
echo "[APK BUILD] Signing APK..."
KEYSTORE="$DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v -keystore "$KEYSTORE" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
fi
"$BUILD_TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-pass pass:android "$DIST/aether-core.apk"

echo "[APK BUILD] Done! Output: $DIST/aether-core.apk"
