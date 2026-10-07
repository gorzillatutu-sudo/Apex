package com.apexcut.mobile;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Switches the launcher icon between the activity-aliases added to the manifest (see native/add_icon_aliases.py). */
@CapacitorPlugin(name = "IconSwitcher")
public class IconSwitcherPlugin extends Plugin {

    private static final String[] IDS = {"default", "prism"};
    private static final String[] ALIAS = {"IconDefault", "IconPrism"};

    private ComponentName comp(int i) {
        return new ComponentName(getContext().getPackageName(), "com.apexcut.mobile." + ALIAS[i]);
    }

    private int current() {
        PackageManager pm = getContext().getPackageManager();
        for (int i = 0; i < IDS.length; i++) {
            int s = pm.getComponentEnabledSetting(comp(i));
            if (s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return i;
        }
        return 0; /* default alias is enabled by manifest default */
    }

    @PluginMethod
    public void get(PluginCall call) {
        JSObject r = new JSObject();
        r.put("id", IDS[current()]);
        call.resolve(r);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String id = call.getString("id", "default");
        int want = -1;
        for (int i = 0; i < IDS.length; i++) if (IDS[i].equals(id)) want = i;
        if (want < 0) { call.reject("Unknown icon"); return; }
        try {
            PackageManager pm = getContext().getPackageManager();
            /* enable the new one first so the app never has "no launcher icon" */
            pm.setComponentEnabledSetting(comp(want), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (int i = 0; i < IDS.length; i++) {
                if (i != want) pm.setComponentEnabledSetting(comp(i), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            JSObject r = new JSObject();
            r.put("id", IDS[want]);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not change icon: " + e.getMessage());
        }
    }
}
