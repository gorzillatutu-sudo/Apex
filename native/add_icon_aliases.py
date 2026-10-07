#!/usr/bin/env python3
"""Turns the single launcher activity into two switchable launcher icons (activity-alias).
Run after `npx cap add android`:  python3 native/add_icon_aliases.py android/app/src/main/AndroidManifest.xml"""
import re, sys

path = sys.argv[1]
s = open(path, encoding="utf-8").read()
if "IconPrism" in s:
    print("aliases already present"); sys.exit(0)

# 1) MainActivity stops being the launcher itself (the aliases are)
s2, n = re.subn(r'\s*<category android:name="android.intent.category.LAUNCHER"\s*/>', '', s, count=1)
if n != 1:
    sys.exit("LAUNCHER category not found in manifest")
s = s2

aliases = '''
        <activity-alias
            android:name=".IconDefault"
            android:targetActivity=".MainActivity"
            android:enabled="true"
            android:exported="true"
            android:icon="@mipmap/ic_launcher"
            android:roundIcon="@mipmap/ic_launcher_round"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity-alias>

        <activity-alias
            android:name=".IconPrism"
            android:targetActivity=".MainActivity"
            android:enabled="false"
            android:exported="true"
            android:icon="@mipmap/ic_launcher_prism"
            android:roundIcon="@mipmap/ic_launcher_prism_round"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity-alias>
'''
# 2) put them right before </application>
s = s.replace("</application>", aliases + "\n    </application>", 1)
open(path, "w", encoding="utf-8").write(s)
print("icon aliases added")
