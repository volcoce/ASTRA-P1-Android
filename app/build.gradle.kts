plugins {
    id("com.android.application")
}

android {
    namespace = "org.astra.publicapp"
    compileSdk = 37

    defaultConfig {
        // Paquet distinct de l'ancien org.astra.mobile : sa clé privée est introuvable.
        applicationId = "org.astra.publicapp"
        minSdk = 26
        targetSdk = 37
        versionCode = 590
        versionName = "0.5.9"
        manifestPlaceholders["appDisplayName"] = "ASTRA"
    }

    val keystorePath = System.getenv("ASTRA_RELEASE_KEYSTORE")
    signingConfigs {
        getByName("debug") {
            // Publicly known test credential; never use for release distribution.
            storeFile = file("../ci/astra-preview-test-signing.p12")
            storePassword = "astra-preview-TEST-only-2026"
            keyAlias = "astra_preview"
            keyPassword = "astra-preview-TEST-only-2026"
            enableV1Signing = false
            enableV2Signing = true
            enableV3Signing = true
        }
        if (!keystorePath.isNullOrBlank()) {
            create("astraRelease") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ASTRA_STORE_PASSWORD")
                keyAlias = System.getenv("ASTRA_KEY_ALIAS")
                keyPassword = System.getenv("ASTRA_KEY_PASSWORD")
                enableV1Signing = false // minSdk 26 : tous les appareils acceptent v2+
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            if (!keystorePath.isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("astraRelease")
            }
        }
        debug {
            isDebuggable = true
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-preview"
            manifestPlaceholders["appDisplayName"] = "ASTRA Preview"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        buildConfig = true
    }
    lint {
        abortOnError = true
    }
}

dependencies {
    // WebViewAssetLoader pour remplacer file:// par un domaine HTTPS virtuel.
    implementation("androidx.webkit:webkit:1.18.0")
}