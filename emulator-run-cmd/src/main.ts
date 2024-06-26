import * as core from '@actions/core';
import {InputOptions} from "@actions/core/lib/core";
import {SdkFactory} from "./sdk";
import execWithResult from "./exec-with-result";

async function run() {
    try {
        let api = core.getInput('api', <InputOptions>{required: false});
        if (api == null || api == "") {
            console.log(`API not set. Using 25`)
            api = '25'
        }

        let abi = core.getInput('abi', <InputOptions>{required: false});
        if (abi == null || abi == "") {
            console.log(`ABI not set. Using armeabi-v7a`)
            abi = 'armeabi-v7a'
        }

        let tag = core.getInput('tag', <InputOptions>{required: false})
        if (tag !== "default" && tag !== "google_apis") {
            console.log(`Unknown tag ${tag}. Using default`)
            tag = 'default'
        }

        let verbose = false
        if (core.getInput('verbose') == "true") {
            verbose = true
        }

        let cmd = core.getInput('cmd', <InputOptions>{required: true})
        if (cmd === "") {
            console.error("Please specify cmd to execute in parallel with emulator")
            return
        }

        let cmdOptions = core.getInput('cmdOptions')
        if (cmdOptions == null) {
            cmdOptions = "-no-snapshot-save -noaudio -no-boot-anim"
        }

        let hardwareProfile = core.getInput('hardwareProfile')
        if (hardwareProfile == null) {
            hardwareProfile = ""
        }

        let disableAnimations = false
        if (core.getInput('disableAnimations') == "true") {
            disableAnimations = true
        }

        let bootTimeout = core.getInput('bootTimeout')
        if (bootTimeout == null) {
            bootTimeout = '720'
        }

        let portNumber = core.getInput('portNumber')
        if (portNumber == null) {
            portNumber = "5554"
        } else
            console.log(`Found portNumber=${Number(portNumber)} ${core.getInput('portNumber')}`)

        console.log(`Starting emulator with:\nAPI=${api} \nABI=${abi} \nTAG=${tag} \nVERBOSE=${verbose} \ncmd=${cmd}  \ncmdOptions=${cmdOptions} \nhardwareProfile=${hardwareProfile} \ndisableAnimations=${disableAnimations} \nbootTimeout=${bootTimeout} \nportNumber=${portNumber}\n`)

        const androidHome = process.env.ANDROID_HOME
        console.log(`ANDROID_HOME is ${androidHome}`)
        console.log(`PATH is ${process.env.PATH}`)

        let sdk = new SdkFactory().getAndroidSdk();

        try {
            await sdk.installEmulatorPackage(api, tag, abi, verbose)
            await sdk.installPlatform(api, verbose)

            let supportsHardwareAcceleration = await sdk.verifyHardwareAcceleration();
            if (!supportsHardwareAcceleration && abi == "x86") {
                core.setFailed('Hardware acceleration is not supported')
                return
            }

            let emulator = await sdk.createEmulator("emulator", api, tag, abi, hardwareProfile, Number(portNumber));
            console.log("starting adb server")
            await sdk.startAdbServer()
            let booted = await emulator.start(cmdOptions, +bootTimeout, Number(portNumber));
            if (!booted) {
                core.setFailed("emulator boot failed")
                await emulator.stop()
                return
            }

            //Pre-setup
            await emulator.unlock()
            if (disableAnimations) {
                await emulator.disableAnimations()
            }
            await emulator.startLogcat()

            console.log("emulator started and booted")
            try {
                let result = await execWithResult(`${cmd}`);
                let code = result.exitCode;
                if (code != 0) {
                    core.setFailed(`process exited with code ${code}`)
                }
            } catch (e) {
                if(e !instanceof Error) {
                    core.setFailed(e.message);
                } else {
                    core.setFailed("unknown (error !instanceof Error) occurred")
                }
            }

            console.log("stopping emulator")
            await emulator.stop()
            await emulator.stopLogcat()
            console.log("emulator is stopped")
        } catch (error) {
            console.error(error)
            if(error !instanceof Error) {
                core.setFailed(error.message);
            } else {
                core.setFailed("unknown (error !instanceof Error) occurred")
            }
            return
        }
    } catch (error) {
        if(error !instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("unknown (error !instanceof Error) occurred")
        }

        return
    }
}

run();
