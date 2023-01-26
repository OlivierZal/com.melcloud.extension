import type Homey from "homey/lib/Homey";
import { type OutdoorTemperatureListenerData } from "../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onHomeyReady(Homey: Homey): Promise<void> {
  await Homey.ready();

  const minimumTemperature: number = 10;
  const maximumTemperature: number = 38;

  const applySelfAdjustElement: HTMLButtonElement = document.getElementById(
    "apply-self-adjust"
  ) as HTMLButtonElement;
  const refreshSelfAdjustElement: HTMLButtonElement = document.getElementById(
    "refresh-self-adjust"
  ) as HTMLButtonElement;
  const thresholdElement: HTMLInputElement = document.getElementById(
    "self_adjust_threshold"
  ) as HTMLInputElement;
  const outdoorTemperatureCapabilityElement: HTMLSelectElement =
    document.getElementById(
      "outdoor_temperature_capability_path"
    ) as HTMLSelectElement;
  const selfAdjustEnabledElement: HTMLSelectElement = document.getElementById(
    "self_adjust_enabled"
  ) as HTMLSelectElement;

  function getHomeySetting(
    element: HTMLInputElement | HTMLSelectElement,
    defaultValue: any = ""
  ): void {
    // @ts-expect-error bug
    Homey.get(element.id, async (error: Error, value: any): Promise<void> => {
      if (error !== null) {
        // @ts-expect-error bug
        await Homey.alert(error.message);
        return;
      }
      element.value = String(value ?? defaultValue);
    });
  }

  function int(
    element: HTMLInputElement,
    value: number = Number.parseInt(element.value)
  ): number {
    if (
      Number.isNaN(value) ||
      value < Number(element.min) ||
      value > Number(element.max)
    ) {
      element.value = "";
      throw new Error(
        `${element.name} must be an integer between ${element.min} and ${element.max}.`
      );
    }
    return value;
  }

  function getHomeySelfAdjustSettings(): void {
    getHomeySetting(outdoorTemperatureCapabilityElement);
    getHomeySetting(selfAdjustEnabledElement, false);
    getHomeySetting(thresholdElement);
  }

  function getMeasureTemperatureCapabilitiesForAta(): void {
    // @ts-expect-error bug
    Homey.api(
      "GET",
      "/drivers/melcloud/available_temperatures",
      async (error: Error, devices: any[]): Promise<void> => {
        if (devices.length === 0) {
          return;
        }
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message);
          return;
        }
        for (const device of devices) {
          const { capabilityPath, capabilityName } = device;
          const option: HTMLOptionElement = document.createElement("option");
          option.setAttribute("value", capabilityPath);
          const optionText: Text = document.createTextNode(capabilityName);
          option.appendChild(optionText);
          outdoorTemperatureCapabilityElement.appendChild(option);
        }
        getHomeySelfAdjustSettings();
      }
    );
  }

  thresholdElement.min = String(minimumTemperature);
  thresholdElement.max = String(maximumTemperature);
  getMeasureTemperatureCapabilitiesForAta();

  outdoorTemperatureCapabilityElement.addEventListener("change", (): void => {
    if (outdoorTemperatureCapabilityElement.value !== "") {
      if (selfAdjustEnabledElement.value === "false") {
        selfAdjustEnabledElement.value = "true";
      }
    } else if (
      outdoorTemperatureCapabilityElement.value === "" &&
      selfAdjustEnabledElement.value === "true"
    ) {
      selfAdjustEnabledElement.value = "false";
    }
  });

  thresholdElement.addEventListener("change", (): void => {
    if (selfAdjustEnabledElement.value === "false") {
      selfAdjustEnabledElement.value = "true";
    }
  });

  refreshSelfAdjustElement.addEventListener("click", (): void => {
    getHomeySelfAdjustSettings();
  });

  applySelfAdjustElement.addEventListener("click", (): void => {
    let threshold: number = 0;
    try {
      threshold = int(thresholdElement);
    } catch (error: unknown) {
      getHomeySelfAdjustSettings();
      // @ts-expect-error bug
      Homey.alert(error.message);
      return;
    }
    const enabled: boolean = selfAdjustEnabledElement.value === "true";
    const capabilityPath: string = outdoorTemperatureCapabilityElement.value;
    const body: OutdoorTemperatureListenerData = {
      capabilityPath,
      enabled,
      threshold,
    };
    // @ts-expect-error bug
    Homey.api(
      "POST",
      "/drivers/melcloud/cooling_self_adjustment",
      body,
      async (error: Error): Promise<void> => {
        getHomeySelfAdjustSettings();
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message);
          return;
        }
        // @ts-expect-error bug
        await Homey.alert("Settings have been successfully saved.");
      }
    );
  });
}