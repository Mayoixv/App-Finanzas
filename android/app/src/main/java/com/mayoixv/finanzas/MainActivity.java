package com.mayoixv.finanzas;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio (no viene de npm): se registra antes de crear el puente.
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
