import type { App } from 'homey'

export namespace AthomCloudAPI {
  export class Device {
    id: string
  }

  export class Homey {
    id: string

    authenticate(options?: { strategy?: string | any[] }): Promise<HomeyAPI>
  }

  export class StorageAdapter {
    get(): Promise<object>

    set(value: object): Promise<void>
  }

  export class StorageAdapterBrowser extends StorageAdapter {
    get(): Promise<object>

    set(value: object): Promise<void>
  }

  export class StorageAdapterMemory extends StorageAdapter {
    get(): Promise<object>

    set(value: object): Promise<void>
  }

  export class Token {
    access_token: string

    expires_in: number

    grant_type: string

    refresh_token: string

    token_type: string
  }

  export class User {
    id: string

    getFirstHomey(): Homey

    getHomeyById(id: string): Homey

    getHomeys(): Homey[]
  }
}

export namespace HomeyAPIV2.ManagerAlarms {
  export class Alarm extends HomeyAPIV3Local.ManagerAlarms.Alarm {
    enabled: boolean

    id: string

    name: string

    nextOccurance: string

    repetition: object

    time: string
  }
}

export namespace HomeyAPIV2.ManagerApps {
  export class App extends HomeyAPIV3Local.ManagerApps.App {
    author: object

    autoupdate: boolean

    brandColor: string

    channel: string

    color: string

    compatibility: string

    crashed: boolean

    crashedCount: number

    crashedMessage: string

    enabled: boolean

    exitCode: number

    exitCount: number

    exitSignal: string

    hasDrivers: boolean

    homey: HomeyAPIV3

    icon: string

    iconObj: object

    id: string

    images: object

    manager: HomeyAPIV3.Manager

    name: string

    origin: string

    permissions: any[]

    ready: boolean

    sdk: number

    session: string

    settings: boolean

    state: string

    updateAvailable: object

    uri: string

    usage: object

    version: string
  }
}

export namespace HomeyAPIV2.ManagerDevices {
  export class Capability extends HomeyAPIV3Local.ManagerDevices.Capability {
    chartType: string

    decimals: number

    desc: string

    getable: boolean

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    max: number

    min: number

    setable: boolean

    step: number

    title: string

    type: string

    units: string

    uri: string

    values: any[]
  }

  export class Device extends HomeyAPIV3Local.ManagerDevices.Device {
    available: boolean

    capabilities: string[]

    capabilitiesObj: Record<string, HomeyAPIV3.ManagerDevices.Capability> | null

    capabilitiesOptions: object

    class: string

    color: string

    data: object

    driverId: string

    driverUri: string

    energy: object

    energyObj: object

    flags: any[]

    homey: HomeyAPIV3

    icon: string

    iconObj: object

    iconOverride: string | null

    id: string

    images: any[]

    insights: any[]

    lastSeenAt: string | null

    manager: HomeyAPIV3.Manager

    name: string

    note: string

    ownerUri: string

    ready: boolean

    repair: boolean

    settings: object

    settingsObj: boolean

    ui: object

    uiIndicator: string | null

    unavailableMessage: string

    unpair: boolean

    uri: string

    virtualClass: string | null

    warningMessage: string | null

    zone: string
  }
}

export namespace HomeyAPIV2.ManagerDrivers {
  export class Driver extends HomeyAPIV3Local.ManagerDrivers.Driver {
    class: string

    color: string

    connectivity: any[]

    deprecated: boolean

    homey: HomeyAPIV3

    icon: string

    iconObj: object

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    ownerIconObj: object

    ownerName: string

    ownerUri: string

    pair: boolean

    ready: boolean

    repair: boolean

    unpair: boolean

    uri: string

    uriObj: object

    userPath: string | null
  }

  export class PairSession extends HomeyAPIV3Local.ManagerDrivers.PairSession {
    deviceId: string

    driverId: string

    driverUri: string

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    type: string

    uri: string

    views: any[]

    zoneId: string
  }
}

export namespace HomeyAPIV2.ManagerFlow {
  export class AdvancedFlow extends HomeyAPIV3Local.ManagerFlow.AdvancedFlow {
    broken: boolean

    cards: object

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    triggerable: boolean

    uri: string
  }

  export class Flow extends HomeyAPIV3Local.ManagerFlow.Flow {
    actions: any[]

    broken: boolean

    conditions: any[]

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    order: number

    trigger: object

    triggerable: boolean

    uri: string
  }

  export class FlowCardAction extends HomeyAPIV3Local.ManagerFlow
    .FlowCardAction {
    advanced: boolean

    args: object

    deprecated: boolean

    droptoken: boolean

    duration: boolean

    durationMax: number | null

    durationMin: number | null

    highlight: boolean

    hint: string

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[]

    uri: string

    uriObj: object
  }

  export class FlowCardCondition extends HomeyAPIV3Local.ManagerFlow
    .FlowCardCondition {
    advanced: boolean

    args: object

    deprecated: boolean

    droptoken: boolean

    duration: boolean

    highlight: boolean

    hint: string

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    uri: string

    uriObj: object
  }

  export class FlowCardTrigger extends HomeyAPIV3Local.ManagerFlow
    .FlowCardTrigger {
    advanced: boolean

    args: object

    deprecated: boolean

    droptoken: boolean

    duration: boolean

    highlight: boolean

    hint: string

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[]

    uri: string

    uriObj: object
  }

  export class FlowFolder extends HomeyAPIV3Local.ManagerFlow.FlowFolder {
    id: string

    name: string

    order: number

    parent: string
  }
}

export namespace HomeyAPIV2.ManagerFlowToken {
  export class FlowToken extends HomeyAPIV3Local.ManagerFlowToken.FlowToken {
    example: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    type: string

    uri: string

    uriObj: object

    value: object
  }
}

export namespace HomeyAPIV2.ManagerImages {
  export class Image extends HomeyAPIV3Local.ManagerImages.Image {
    id: string

    lastUpdated: string

    ownerUri: string

    url: string
  }
}

export namespace HomeyAPIV2.ManagerInsights {
  export class Log extends HomeyAPIV3Local.ManagerInsights.Log {
    decimals: number

    homey: HomeyAPIV3

    id: string

    lastValue: number

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFalse: string

    titleTrue: string

    type: string

    units: string

    uri: string
  }
}

export namespace HomeyAPIV2.ManagerLogic {
  export class Variable extends HomeyAPIV3Local.ManagerLogic.Variable {
    id: string

    name: string

    type: string

    value: boolean | number | string
  }
}

export namespace HomeyAPIV2.ManagerNotifications {
  export class Notification extends HomeyAPIV3Local.ManagerNotifications
    .Notification {
    dateCreated: object

    dateExpires: string

    excerpt: string

    icon: string

    iconObj: object

    id: string

    meta: object

    ownerName: string

    ownerUri: string

    priority: string

    readBy: any[]

    roles: any[]
  }
}

export namespace HomeyAPIV2.ManagerSessions {
  export class Session extends HomeyAPIV3Local.ManagerSessions.Session {
    agent: string

    clientName: string

    createdAt: string

    expiresAt: string

    id: string

    intersectedScopes: any[]

    lastUsed: boolean

    scopes: any[]

    type: string
  }
}

export namespace HomeyAPIV2.ManagerSpeechOutput {
  export class Voice extends HomeyAPIV3Local.ManagerSpeechOutput.Voice {
    gender: string

    id: string

    language: string

    locale: string

    name: string
  }
}

export namespace HomeyAPIV2.ManagerUsers {
  export class User extends HomeyAPIV3Local.ManagerUsers.User {
    asleep: boolean

    athomId: string

    avatar: string | null

    enabled: boolean

    enabledUntil: string | null

    id: string

    inviteUrl: string | null

    name: string

    present: boolean

    properties: object

    role: string

    verified: boolean
  }
}

export namespace HomeyAPIV2.ManagerZones {
  export class Zone extends HomeyAPIV3Local.ManagerZones.Zone {
    active: boolean

    activeLastUpdated: string | null

    activeOrigins: any[]

    homey: HomeyAPIV3

    icon: string

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    order: number

    parent: string

    uri: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerApps {
  export class App extends HomeyAPIV3.ManagerApps.App {
    author: object

    channel: string

    color: string

    compatibility: string

    crashed: boolean

    crashedMessage: string | null

    enabled: boolean

    homey: HomeyAPIV3

    iconObj: object

    id: string

    images: object

    manager: HomeyAPIV3.Manager

    name: string

    origin: string

    permissions: any[]

    state: string

    uri: string

    version: string

    call(options: {
      body: any
      method: 'DELETE' | 'GET' | 'POST' | 'PUT'
      path: string
    }): Promise<any>

    connect(): Promise<any>

    delete(options: { path: string }): Promise<any>

    disconnect(): Promise<any>

    get(options: { path: string }): Promise<any>

    post(options: { body: object; path: string }): Promise<any>

    put(options: { body: object; path: string }): Promise<any>
  }

  export class AppSettings {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerCloud {
  export class Webhook {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerCron {
  export class Cronjob {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerDashboards {
  export class AppWidget {
    id: string
  }

  export class Dashboard {
    columns: any[]

    id: string

    name: string
  }

  export class WidgetStore {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerDevices {
  export class Capability extends HomeyAPIV3.ManagerDevices.Capability {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Device extends HomeyAPIV3.ManagerDevices.Device {
    available: boolean

    capabilities: string[]

    capabilitiesObj: Record<string, HomeyAPIV3.ManagerDevices.Capability> | null

    class: string

    color: string | null

    data: object

    driverId: string

    energy: object | null

    energyObj: object | null

    flags: any[]

    homey: HomeyAPIV3

    icon: string | null

    iconObj: object | null

    iconOverride: string | null

    id: string

    images: any[]

    lastSeenAt: string | null

    manager: HomeyAPIV3.Manager

    name: string

    note: string | null

    ownerUri: string

    ready: boolean

    repair: boolean | null

    settings: object

    settingsObj: boolean

    ui: object

    uiIndicator: string | null

    unavailableMessage: string | null

    unpair: boolean | null

    uri: string

    virtualClass: string | null

    warningMessage: string | null

    zone: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getAdvancedFlows(): Promise<
      Record<string, HomeyAPIV3.ManagerFlow.AdvancedFlow>
    >

    getDriver(): Promise<HomeyAPIV3.ManagerDrivers.Driver>

    getFlows(): Promise<Record<string, HomeyAPIV3.ManagerFlow.Flow>>

    getLogs(): Promise<Record<string, HomeyAPIV3.ManagerInsights.Log>>

    getZone(): Promise<HomeyAPIV3.ManagerZones.Zone>

    makeCapabilityInstance(
      capabilityId: string,

      listener: (value: boolean | number | string) => any,
    ): HomeyAPIV3.ManagerDevices.Device.DeviceCapability

    setCapabilityValue(options: {
      capabilityId: string
      value: boolean | number | string
      opts?: {
        duration?: number
      }
    }): Promise<void>
  }
}

export namespace HomeyAPIV3Cloud.ManagerDrivers {
  export class Driver extends HomeyAPIV3.ManagerDrivers.Driver {
    class: string

    color: string

    connectivity: any[]

    deprecated: boolean

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    ownerIconObj: object

    ownerName: string

    ownerUri: string

    pair: boolean

    ready: boolean

    repair: boolean

    unpair: boolean

    uri: string

    userPath: string | null

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class PairSession extends HomeyAPIV3.ManagerDrivers.PairSession {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3Cloud.ManagerEnergy {
  export class EnergyReportDay {
    id: string
  }

  export class EnergyReportHour {
    id: string
  }

  export class EnergyReportMonth {
    id: string
  }

  export class EnergyReportWeek {
    id: string
  }

  export class EnergyReportYear {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerFlow {
  export class AdvancedFlow extends HomeyAPIV3.ManagerFlow.AdvancedFlow {
    cards: object

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    triggerable: boolean

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class Flow extends HomeyAPIV3.ManagerFlow.Flow {
    actions: any[]

    conditions: any[]

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    trigger: object

    triggerable: boolean

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class FlowCardAction extends HomeyAPIV3.ManagerFlow.FlowCardAction {
    advanced: boolean

    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    duration: boolean

    durationMax: number | null

    durationMin: number | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[] | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardCondition extends HomeyAPIV3.ManagerFlow
    .FlowCardCondition {
    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardTrigger extends HomeyAPIV3.ManagerFlow.FlowCardTrigger {
    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[] | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowFolder {
    id: string

    name: string

    parent: string | null
  }
}

export namespace HomeyAPIV3Cloud.ManagerFlowToken {
  export class FlowToken extends HomeyAPIV3.ManagerFlowToken.FlowToken {
    example: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    type: string

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3Cloud.ManagerIcons {
  export class Icon {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerImages {
  export class Image {
    id: string

    lastUpdated: string

    ownerUri: string

    url: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerInsights {
  export class Log extends HomeyAPIV3.ManagerInsights.Log {
    decimals: number | null

    homey: HomeyAPIV3

    id: string

    lastValue: any | null

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFalse: string | null

    titleTrue: string | null

    type: string

    units: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class LogEntryBoolean {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerLogic {
  export class Variable {
    id: string

    name: string

    type: string

    value: boolean | number | string
  }
}

export namespace HomeyAPIV3Cloud.ManagerMoods {
  export class Mood {
    devices: object

    id: string

    name: string

    preset: string | null

    zone: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerNotifications {
  export class Notification {
    dateCreated: string

    excerpt: string

    id: string

    meta: object

    ownerName: string

    ownerUri: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerRF {
  export class Signal {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerSessions {
  export class Session {
    id: string

    intersectedScopes: any[]

    scopes: any[]

    type: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerUsers {
  export class User {
    asleep: boolean | null

    athomId: string | null

    avatar: string | null

    enabled: boolean

    enabledUntil: string | null

    id: string

    inviteUrl: string | null

    name: string | null

    present: boolean | null

    properties: object

    role: string

    verified: boolean
  }
}

export namespace HomeyAPIV3Cloud.ManagerVirtualDevice {
  export class VirtualDeviceDummySocket {
    id: string
  }

  export class VirtualDeviceEnergyDongle {
    id: string
  }

  export class VirtualDeviceGroup {
    id: string
  }

  export class VirtualDeviceHomeyBridge {
    id: string
  }

  export class VirtualDeviceInfrared {
    id: string
  }

  export class VirtualDeviceRF433 {
    id: string
  }

  export class VirtualDeviceZigbee {
    id: string
  }

  export class VirtualDeviceZwave {
    id: string
  }

  export class VirtualDriverDummySocket {
    id: string
  }

  export class VirtualDriverEnergyDongle {
    id: string
  }

  export class VirtualDriverGroup {
    id: string
  }

  export class VirtualDriverHomeyBridge {
    id: string
  }

  export class VirtualDriverInfrared {
    id: string
  }

  export class VirtualDriverRF433 {
    id: string
  }

  export class VirtualDriverZigbee {
    id: string
  }

  export class VirtualDriverZwave {
    id: string
  }
}

export namespace HomeyAPIV3Cloud.ManagerZones {
  export class Zone extends HomeyAPIV3.ManagerZones.Zone {
    active: boolean

    activeLastUpdated: string | null

    activeOrigins: any[]

    homey: HomeyAPIV3

    icon: string

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    parent: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getParent(): Promise<HomeyAPIV3.ManagerZones.Zone | null>
  }
}

export namespace HomeyAPIV3Local.ManagerAlarms {
  export class Alarm {}
}

export namespace HomeyAPIV3Local.ManagerApps {
  export class App extends HomeyAPIV3.ManagerApps.App {
    author: object

    autoupdate: boolean

    channel: string

    color: string

    compatibility: string

    crashed: boolean

    crashedCount: number

    crashedMessage: string | null

    enabled: boolean

    homey: HomeyAPIV3

    iconObj: object

    id: string

    images: object

    manager: HomeyAPIV3.Manager

    name: string

    origin: string

    permissions: any[]

    settings: boolean | null

    state: string

    updateAvailable: boolean

    uri: string

    usage: object

    version: string

    call(options: {
      body: any
      method: 'DELETE' | 'GET' | 'POST' | 'PUT'
      path: string
    }): Promise<any>

    connect(): Promise<any>

    delete(options: { path: string }): Promise<any>

    disconnect(): Promise<any>

    get(options: { path: string }): Promise<any>

    post(options: { body: object; path: string }): Promise<any>

    put(options: { body: object; path: string }): Promise<any>
  }

  export class AppSettings {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerCloud {
  export class Webhook {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerCron {
  export class Cronjob {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerDashboards {
  export class AppWidget {
    id: string
  }

  export class Dashboard {
    columns: any[]

    id: string

    name: string
  }

  export class WidgetStore {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerDevices {
  export class Capability extends HomeyAPIV3.ManagerDevices.Capability {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    title: string

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Device extends HomeyAPIV3.ManagerDevices.Device {
    available: boolean

    capabilities: string[]

    capabilitiesObj: Record<string, HomeyAPIV3.ManagerDevices.Capability> | null

    class: string

    color: string | null

    data: object

    driverId: string

    energy: object | null

    energyObj: object | null

    flags: any[]

    homey: HomeyAPIV3

    icon: string | null

    iconObj: object | null

    iconOverride: string | null

    id: string

    images: any[]

    lastSeenAt: string | null

    manager: HomeyAPIV3.Manager

    name: string

    note: string | null

    ownerUri: string

    ready: boolean

    repair: boolean | null

    settings: object

    settingsObj: boolean

    ui: object

    uiIndicator: string | null

    unavailableMessage: string | null

    unpair: boolean | null

    uri: string

    virtualClass: string | null

    warningMessage: string | null

    zone: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getAdvancedFlows(): Promise<
      Record<string, HomeyAPIV3.ManagerFlow.AdvancedFlow>
    >

    getDriver(): Promise<HomeyAPIV3.ManagerDrivers.Driver>

    getFlows(): Promise<Record<string, HomeyAPIV3.ManagerFlow.Flow>>

    getLogs(): Promise<Record<string, HomeyAPIV3.ManagerInsights.Log>>

    getZone(): Promise<HomeyAPIV3.ManagerZones.Zone>

    makeCapabilityInstance(
      capabilityId: string,

      listener: (value: boolean | number | string) => any,
    ): HomeyAPIV3.ManagerDevices.Device.DeviceCapability

    setCapabilityValue(options: {
      capabilityId: string
      value: boolean | number | string
      opts?: {
        duration?: number
      }
    }): Promise<void>
  }
}

export namespace HomeyAPIV3Local.ManagerDiscovery {
  export class DiscoveryStrategyMAC {
    id: string
  }

  export class DiscoveryStrategyMDNSSD {
    id: string
  }

  export class DiscoveryStrategySSDP {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerDrivers {
  export class Driver extends HomeyAPIV3.ManagerDrivers.Driver {
    class: string

    color: string

    connectivity: any[]

    deprecated: boolean

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    ownerIconObj: object

    ownerName: string

    ownerUri: string

    pair: boolean

    ready: boolean

    repair: boolean

    unpair: boolean

    uri: string

    userPath: string | null

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class PairSession extends HomeyAPIV3.ManagerDrivers.PairSession {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3Local.ManagerEnergy {
  export class EnergyReportDay {
    id: string
  }

  export class EnergyReportHour {
    id: string
  }

  export class EnergyReportMonth {
    id: string
  }

  export class EnergyReportWeek {
    id: string
  }

  export class EnergyReportYear {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerExperiments {
  export class ExperimentHomeKit {
    id: string
  }

  export class ExperimentPowerUser {
    id: string
  }

  export class ExperimentSSH {
    id: string
  }

  export class ExperimentVirtualDevices {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerFlow {
  export class AdvancedFlow extends HomeyAPIV3.ManagerFlow.AdvancedFlow {
    cards: object

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    triggerable: boolean

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class Flow extends HomeyAPIV3.ManagerFlow.Flow {
    actions: any[]

    conditions: any[]

    enabled: boolean

    folder: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    trigger: object

    triggerable: boolean

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class FlowCardAction extends HomeyAPIV3.ManagerFlow.FlowCardAction {
    advanced: boolean

    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    duration: boolean

    durationMax: number | null

    durationMin: number | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[] | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardCondition extends HomeyAPIV3.ManagerFlow
    .FlowCardCondition {
    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardTrigger extends HomeyAPIV3.ManagerFlow.FlowCardTrigger {
    args: any[] | null

    deprecated: boolean | null

    droptoken: any[] | null

    highlight: boolean | null

    hint: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFormatted: string | null

    tokens: any[] | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowFolder {
    id: string

    name: string

    parent: string | null
  }
}

export namespace HomeyAPIV3Local.ManagerFlowToken {
  export class FlowToken extends HomeyAPIV3.ManagerFlowToken.FlowToken {
    example: string | null

    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    type: string

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3Local.ManagerIcons {
  export class Icon {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerImages {
  export class Image {
    id: string

    lastUpdated: string

    ownerUri: string

    url: string
  }
}

export namespace HomeyAPIV3Local.ManagerInsights {
  export class Log extends HomeyAPIV3.ManagerInsights.Log {
    decimals: number | null

    homey: HomeyAPIV3

    id: string

    lastValue: any | null

    manager: HomeyAPIV3.Manager

    ownerId: string

    ownerName: string

    ownerUri: string

    title: string

    titleFalse: string | null

    titleTrue: string | null

    type: string

    units: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class LogEntryBoolean {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerLogic {
  export class Variable {
    id: string

    name: string

    type: string

    value: boolean | number | string
  }
}

export namespace HomeyAPIV3Local.ManagerMoods {
  export class Mood {
    devices: object

    id: string

    name: string

    preset: string | null

    zone: string
  }
}

export namespace HomeyAPIV3Local.ManagerNotifications {
  export class Notification {
    dateCreated: string

    excerpt: string

    id: string

    meta: object

    ownerName: string

    ownerUri: string
  }
}

export namespace HomeyAPIV3Local.ManagerRF {
  export class Signal {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerSessions {
  export class Session {
    id: string

    intersectedScopes: any[]

    scopes: any[]

    type: string
  }
}

export namespace HomeyAPIV3Local.ManagerUsers {
  export class User {
    asleep: boolean | null

    athomId: string | null

    avatar: string | null

    enabled: boolean

    enabledUntil: string | null

    id: string

    inviteUrl: string | null

    name: string | null

    present: boolean | null

    properties: object

    role: string

    verified: boolean
  }
}

export namespace HomeyAPIV3Local.ManagerVirtualDevice {
  export class VirtualDeviceDummySocket {
    id: string
  }

  export class VirtualDeviceEnergyDongle {
    id: string
  }

  export class VirtualDeviceGroup {
    id: string
  }

  export class VirtualDeviceHomeyBridge {
    id: string
  }

  export class VirtualDeviceInfrared {
    id: string
  }

  export class VirtualDeviceMatter {
    id: string
  }

  export class VirtualDeviceRF433 {
    id: string
  }

  export class VirtualDeviceVirtualButton {
    id: string
  }

  export class VirtualDeviceVirtualIPCamera {
    id: string
  }

  export class VirtualDeviceVirtualSocket {
    id: string
  }

  export class VirtualDeviceZigbee {
    id: string
  }

  export class VirtualDeviceZwave {
    id: string
  }

  export class VirtualDriverDummySocket {
    id: string
  }

  export class VirtualDriverEnergyDongle {
    id: string
  }

  export class VirtualDriverGroup {
    id: string
  }

  export class VirtualDriverHomeyBridge {
    id: string
  }

  export class VirtualDriverInfrared {
    id: string
  }

  export class VirtualDriverMatter {
    id: string
  }

  export class VirtualDriverRF433 {
    id: string
  }

  export class VirtualDriverVirtualButton {
    id: string
  }

  export class VirtualDriverVirtualIPCamera {
    id: string
  }

  export class VirtualDriverVirtualSocket {
    id: string
  }

  export class VirtualDriverZigbee {
    id: string
  }

  export class VirtualDriverZwave {
    id: string
  }
}

export namespace HomeyAPIV3Local.ManagerZones {
  export class Zone extends HomeyAPIV3.ManagerZones.Zone {
    active: boolean

    activeLastUpdated: string | null

    activeOrigins: any[]

    homey: HomeyAPIV3

    icon: string

    id: string

    manager: HomeyAPIV3.Manager

    name: string

    parent: string | null

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getParent(): Promise<HomeyAPIV3.ManagerZones.Zone | null>
  }
}

export class APIError extends Error {
  message: string

  message: string

  statusCode: number

  statusCode: number

  constructor(
    message: string,

    statusCode: number,
  )
}

export class APIError extends Error {
  message: string

  message: string

  statusCode: number

  statusCode: number

  constructor(
    message: string,

    statusCode: number,
  )
}

export class APIErrorHomeyOffline extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorHomeyOffline'
  }
}

export class APIErrorHomeyOffline extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorHomeyOffline'
  }
}

export class APIErrorNotFound extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorNotFound'
  }
}

export class APIErrorNotFound extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorNotFound'
  }
}

export class APIErrorTimeout extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorTimeout'
  }
}

export class APIErrorTimeout extends APIError {
  message: string

  statusCode: number

  constructor() {
    super()
    this.name = 'APIErrorTimeout'
  }
}

export class AthomCloudAPI {
  constructor(options?: {
    clientId: string
    clientSecret: string
    redirectUrl: string
    autoRefreshTokens?: boolean
    baseUrl?: string
    debug?: boolean
    secret?: string
    store?: AthomCloudAPI.StorageAdapter
    token?: AthomCloudAPI.Token
  })

  authenticateWithAuthorizationCode(options?: {
    code: string
    removeCodeFromHistory?: boolean
  }): Promise<AthomCloudAPI.Token>
  authenticateWithAuthorizationCode(options?: {
    code: string
    removeCodeFromHistory?: boolean
  }): Promise<AthomCloudAPI.Token>

  createAuthenticatedUserClient(options: {
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
  createAuthenticatedUserClient(options: {
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>

  deleteAuthenticatedUserClient(options: { id: string }): Promise<any>
  deleteAuthenticatedUserClient(options: { id: string }): Promise<any>

  getAuthenticatedUser(options: { additionalScopes?: string }): Promise<any>
  getAuthenticatedUser(options?: {
    $cache?: object
  }): Promise<AthomCloudAPI.User>
  getAuthenticatedUser(options: { additionalScopes?: string }): Promise<any>
  getAuthenticatedUser(options?: {
    $cache?: object
  }): Promise<AthomCloudAPI.User>

  getAuthenticatedUserClients(): Promise<any>
  getAuthenticatedUserClients(): Promise<any>

  getAuthenticatedUserNewsletterStatus(): Promise<any>
  getAuthenticatedUserNewsletterStatus(): Promise<any>

  getInstallerInformation(options: { userId: string }): Promise<any>
  getInstallerInformation(options: { userId: string }): Promise<any>

  getLoginUrl(options?: { scopes?: string[]; state?: string }): string
  getLoginUrl(options?: { scopes?: string[]; state?: string }): string

  hasAuthorizationCode(): boolean
  hasAuthorizationCode(): boolean

  isLoggedIn(): Promise<boolean>
  isLoggedIn(): Promise<boolean>

  logout(): Promise<void>
  logout(): Promise<void>

  subscribeAuthenticatedUserToNewsletter(options: {
    language?: string
  }): Promise<any>
  subscribeAuthenticatedUserToNewsletter(options: {
    language?: string
  }): Promise<any>

  unsubscribeAuthenticatedUserFromNewsletter(): Promise<any>
  unsubscribeAuthenticatedUserFromNewsletter(): Promise<any>

  updateAuthenticatedUserClient(options: {
    id: string
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
  updateAuthenticatedUserClient(options: {
    id: string
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
}

export class AthomCloudAPI {
  constructor(options?: {
    clientId: string
    clientSecret: string
    redirectUrl: string
    autoRefreshTokens?: boolean
    baseUrl?: string
    debug?: boolean
    secret?: string
    store?: AthomCloudAPI.StorageAdapter
    token?: AthomCloudAPI.Token
  })

  authenticateWithAuthorizationCode(options?: {
    code: string
    removeCodeFromHistory?: boolean
  }): Promise<AthomCloudAPI.Token>
  authenticateWithAuthorizationCode(options?: {
    code: string
    removeCodeFromHistory?: boolean
  }): Promise<AthomCloudAPI.Token>

  createAuthenticatedUserClient(options: {
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
  createAuthenticatedUserClient(options: {
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>

  deleteAuthenticatedUserClient(options: { id: string }): Promise<any>
  deleteAuthenticatedUserClient(options: { id: string }): Promise<any>

  getAuthenticatedUser(options: { additionalScopes?: string }): Promise<any>
  getAuthenticatedUser(options?: {
    $cache?: object
  }): Promise<AthomCloudAPI.User>
  getAuthenticatedUser(options: { additionalScopes?: string }): Promise<any>
  getAuthenticatedUser(options?: {
    $cache?: object
  }): Promise<AthomCloudAPI.User>

  getAuthenticatedUserClients(): Promise<any>
  getAuthenticatedUserClients(): Promise<any>

  getAuthenticatedUserNewsletterStatus(): Promise<any>
  getAuthenticatedUserNewsletterStatus(): Promise<any>

  getInstallerInformation(options: { userId: string }): Promise<any>
  getInstallerInformation(options: { userId: string }): Promise<any>

  getLoginUrl(options?: { scopes?: string[]; state?: string }): string
  getLoginUrl(options?: { scopes?: string[]; state?: string }): string

  hasAuthorizationCode(): boolean
  hasAuthorizationCode(): boolean

  isLoggedIn(): Promise<boolean>
  isLoggedIn(): Promise<boolean>

  logout(): Promise<void>
  logout(): Promise<void>

  subscribeAuthenticatedUserToNewsletter(options: {
    language?: string
  }): Promise<any>
  subscribeAuthenticatedUserToNewsletter(options: {
    language?: string
  }): Promise<any>

  unsubscribeAuthenticatedUserFromNewsletter(): Promise<any>
  unsubscribeAuthenticatedUserFromNewsletter(): Promise<any>

  updateAuthenticatedUserClient(options: {
    id: string
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
  updateAuthenticatedUserClient(options: {
    id: string
    name?: string
    redirectUri?: any[]
    scopes?: any[]
  }): Promise<any>
}

export class HomeyAPI {
  static createAppAPI(options: {
    homey: Homey
    debug?: Function | null
  }): Promise<HomeyAPI>

  static createLocalAPI(options: {
    address: string
    debug: Function | null
    token: string
  }): Promise<any>

  __(input: { en: string; nl: string }): string | null

  hasRole(roleId: string): any
}

export class HomeyAPIV1 extends HomeyAPI {}

export class HomeyAPIV3 extends HomeyAPI {
  __(input: { en: string; nl: string }): string | null

  hasRole(roleId: string): any

  isConnected(): boolean
}

export class HomeyAPIV2 extends HomeyAPIV3 {
  devices: HomeyAPIV2.ManagerDevices
}

export class HomeyAPIV3Cloud extends HomeyAPIV3 {
  devices: HomeyAPIV3Cloud.ManagerDevices

  __(input: { en: string; nl: string }): string | null

  hasRole(roleId: string): any

  isConnected(): boolean
}

export class HomeyAPIV3Local extends HomeyAPIV3 {
  devices: HomeyAPIV3Local.ManagerDevices

  static createAppAPI(options: {
    homey: Homey
    debug?: Function | null
  }): Promise<HomeyAPIV3Local>

  __(input: { en: string; nl: string }): string | null

  hasRole(roleId: string): any

  isConnected(): boolean
}

export namespace HomeyAPIV3Cloud {
  export class Item extends HomeyAPIV3.Item {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Manager extends HomeyAPIV3.Manager {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }

  export class ManagerApi extends HomeyAPIV3.ManagerApi {
    getState(): Promise<any>
  }

  export class ManagerApps extends HomeyAPIV3.ManagerApps {
    getApp(options: { id: string }): Promise<ManagerApps.App>

    getAppSetting(options: { id: string; name: string }): Promise<any>

    getAppSettings(options: { id: string }): Promise<ManagerApps.AppSettings>

    getAppStd(options: { id: string; message: string }): Promise<any>

    getApps(): Promise<Record<string, ManagerApps.App>>

    getState(): Promise<any>

    installFromAppStore(options: { id: string; channel?: string }): Promise<any>

    setAppSetting(options: {
      id: string
      name: string
      value: any
    }): Promise<any>

    uninstallApp(options: { id: string }): Promise<any>

    unsetAppSetting(options: { id: string; name: string }): Promise<any>
  }

  export class ManagerBLE extends HomeyAPIV3.ManagerBLE {
    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>
  }

  export class ManagerClock extends HomeyAPIV3.ManagerClock {
    getState(): Promise<any>
  }

  export class ManagerCloud extends HomeyAPIV3.ManagerCloud {
    emitOAuth2Callback(options: {
      app?: string
      code?: string
      token?: string
    }): Promise<any>

    emitWebhookCallback(options: { id: string; args?: object }): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerCoprocessor extends HomeyAPIV3.ManagerCoprocessor {
    getBridges(): Promise<any>

    getLog(): Promise<any>

    getState(): Promise<any>

    pairBridge(options: { serialHash: string }): Promise<any>
  }

  export class ManagerCron extends HomeyAPIV3.ManagerCron {
    getState(): Promise<any>
  }

  export class ManagerDashboards extends HomeyAPIV3.ManagerDashboards {
    createDashboard(options: {
      dashboard: {
        columns: any[]
        name: string
      }
    }): Promise<ManagerDashboards.Dashboard>

    deleteDashboard(options: { id: string }): Promise<any>

    getAppWidget(options: { id: string }): Promise<ManagerDashboards.AppWidget>

    getAppWidgetAutocomplete(options: {
      id: string
      query: string
      settingId: string
      settings?: object
    }): Promise<any>

    getAppWidgets(): Promise<Record<string, ManagerDashboards.AppWidget>>

    getDashboard(options: { id: string }): Promise<ManagerDashboards.Dashboard>

    getDashboards(): Promise<Record<string, ManagerDashboards.Dashboard>>

    getState(): Promise<any>

    getWidgetStore(options: {
      id: string
    }): Promise<ManagerDashboards.WidgetStore>

    getWidgetStoreState(options: { id: string }): Promise<any>

    getWidgetStores(): Promise<Record<string, ManagerDashboards.WidgetStore>>

    setWidgetStoreState(options: {
      id: string
      state: object
      replace?: boolean
    }): Promise<any>

    updateDashboard(options: {
      dashboard: {
        columns?: any[]
        name?: string
      }
      id: string
    }): Promise<ManagerDashboards.Dashboard>
  }

  export class ManagerDatabase extends HomeyAPIV3.ManagerDatabase {
    getState(): Promise<any>
  }

  export class ManagerDevices extends HomeyAPIV3.ManagerDevices {
    createGroup(options: {
      group: {
        class: string
        deviceIds: any[]
        name: string
        zoneId: string
        iconDeviceId?: string
        iconOverride?: string
      }
    }): Promise<any>

    deleteDevice(options: { id: string }): Promise<any>

    deleteDeviceFromGroup(options: {
      deviceId: string
      groupId: string
    }): Promise<any>

    getCapabilityValue(options: {
      capabilityId: string
      deviceId: string
    }): Promise<any>

    getDevice(options: { id: string }): Promise<ManagerDevices.Device>

    getDeviceSettingsObj(options: { id: string }): Promise<any>

    getDevices(): Promise<Record<string, ManagerDevices.Device>>

    getState(): Promise<any>

    hideDeviceFromExternalService(options: {
      id: string
      service: string
    }): Promise<any>

    setCapabilityValue(options: {
      capabilityId: string
      deviceId: string
      value: boolean | number | string
      opts?: object
      transactionId?: string
    }): Promise<any>

    setDeviceSettings(options: { id: string; settings: object }): Promise<any>

    unhideDeviceFromExternalService(options: {
      id: string
      service: string
    }): Promise<any>

    updateDevice(options: {
      device: {
        hidden?: boolean
        iconOverride?: string
        name?: string
        note?: string
        uiIndicator?: string
        virtualClass?: string
        zone?: string
      }
      id: string
    }): Promise<ManagerDevices.Device>

    updateGroup(options: {
      group: {
        deviceIds?: any[]
        iconDeviceId?: string
        iconOverride?: string
        name?: string
      }
      id: string
    }): Promise<any>
  }

  export class ManagerDevkit extends HomeyAPIV3.ManagerDevkit {
    getState(): Promise<any>

    installApp(options: { manifest: object; clean?: boolean }): Promise<any>

    uninstallApp(options: { sessionId: string }): Promise<any>
  }

  export class ManagerDrivers extends HomeyAPIV3.ManagerDrivers {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    createPairSession(options: {
      pairsession: {
        driverId: string
        type: string
        deviceId?: string
        zoneId?: string
      }
    }): Promise<ManagerDrivers.PairSession>

    createPairSessionDevice(options: {
      device: {
        data: any
        capabilities?: any[]
        capabilitiesOptions?: object
        class?: string
        energy?: object
        icon?: string
        iconOverride?: string
        name?: string
        settings?: object
        store?: object
        zone?: string
      }
      id: string
    }): Promise<any>

    deletePairSession(options: { id: string }): Promise<any>

    deletePairSessionDevice(options: { id: string }): Promise<any>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    emitPairingCallback(options: {
      callbackId: string
      id: string
      data?: any
    }): Promise<any>

    emitPairingEvent(options: {
      event: string
      id: string
      data?: any
    }): Promise<any>

    emitPairingHeartbeat(options: { id: string }): Promise<any>

    getDrivers(): Promise<Record<string, ManagerDrivers.Driver>>

    getPairSession(options: { id: string }): Promise<ManagerDrivers.PairSession>

    getState(): Promise<any>

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }

  export class ManagerEnergy extends HomeyAPIV3.ManagerEnergy {
    deleteReports(): Promise<any>

    fetchDynamicElectricityPrices(options: { date: string }): Promise<any>

    getCurrency(): Promise<any>

    getDynamicElectricityPriceUserCosts(): Promise<any>

    getDynamicPricesElectricityZone(): Promise<any>

    getDynamicPricesElectricityZones(): Promise<any>

    getElectricityPriceType(): Promise<any>

    getLiveReport(options: { zone?: string }): Promise<any>

    getOptionElectricityPriceDynamicPreferredInterval(): Promise<any>

    getOptionElectricityPriceFixed(): Promise<any>

    getOptionGasPriceFixed(): Promise<any>

    getOptionWaterPriceFixed(): Promise<any>

    getReportDay(options: { date: string; cache?: string }): Promise<any>

    getReportMonth(options: { yearMonth: string; cache?: string }): Promise<any>

    getReportsAvailable(): Promise<any>

    getReportWeek(options: { isoWeek: string; cache?: string }): Promise<any>

    getReportYear(options: { year: string; cache?: string }): Promise<any>

    getState(): Promise<any>

    resetReportDayCategories(options: {
      options: {
        categories?: any[]
        date?: string
        deviceIds?: any[]
      }
    }): Promise<any>

    setDynamicElectricityPriceUserCosts(options: {
      mathExpression: string
      type?: string
    }): Promise<any>

    setDynamicPricesElectricityZone(options: {
      options: {
        zoneCountryKey?: string
        zoneId?: string
        zoneName?: string
        zoneVersion?: string
      }
    }): Promise<any>

    setElectricityPriceType(options: { type: string }): Promise<any>

    setOptionElectricityPriceDynamicPreferredInterval(options: {
      value: any
    }): Promise<any>

    setOptionElectricityPriceFixed(options: { value: any }): Promise<any>

    setOptionGasPriceFixed(options: { value: any }): Promise<any>

    setOptionWaterPriceFixed(options: { value: any }): Promise<any>

    unsetDynamicElectricityPriceUserCosts(): Promise<any>

    unsetOptionElectricityPriceDynamicPreferredInterval(): Promise<any>

    unsetOptionElectricityPriceFixed(): Promise<any>

    unsetOptionGasPriceFixed(): Promise<any>

    unsetOptionWaterPriceFixed(): Promise<any>
  }

  export class ManagerEnergyDongle extends HomeyAPIV3.ManagerEnergyDongle {
    getOptionPhaseLoadNotificationSettings(): Promise<any>

    setOptionPhaseLoadNotificationSettings(options: {
      value: any
    }): Promise<any>

    unsetOptionPhaseLoadNotificationSettings(): Promise<any>
  }

  export class ManagerFlow extends HomeyAPIV3.ManagerFlow {
    createAdvancedFlow(options: {
      advancedflow: any
    }): Promise<ManagerFlow.AdvancedFlow>

    createFlow(options: {
      flow: {
        actions: any[]
        conditions: any[]
        name: string
        trigger: object
        enabled?: boolean
        folder?: string
      }
    }): Promise<ManagerFlow.Flow>

    createFlowFolder(options: {
      flowfolder: {
        name: string
        parent?: string
      }
    }): Promise<ManagerFlow.FlowFolder>

    deleteAdvancedFlow(options: { id: string }): Promise<any>

    deleteFlow(options: { id: string }): Promise<any>

    deleteFlowFolder(options: { id: string }): Promise<any>

    getAdvancedFlow(options: { id: string }): Promise<ManagerFlow.AdvancedFlow>

    getAdvancedFlows(): Promise<Record<string, ManagerFlow.AdvancedFlow>>

    getFlow(options: { id: string }): Promise<ManagerFlow.Flow>

    getFlowCardAction(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardAction>

    getFlowCardActions(): Promise<Record<string, ManagerFlow.FlowCardAction>>

    getFlowCardAutocomplete(options: {
      id: string
      name: string
      query: string
      type: string
      uri: string
      args?: object
    }): Promise<any>

    getFlowCardCondition(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardCondition>

    getFlowCardConditions(): Promise<
      Record<string, ManagerFlow.FlowCardCondition>
    >

    getFlowCardTrigger(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardTrigger>

    getFlowCardTriggers(): Promise<Record<string, ManagerFlow.FlowCardTrigger>>

    getFlowFolder(options: { id: string }): Promise<ManagerFlow.FlowFolder>

    getFlowFolders(): Promise<Record<string, ManagerFlow.FlowFolder>>

    getFlows(): Promise<Record<string, ManagerFlow.Flow>>

    getState(): Promise<any>

    runFlowCardAction(options: {
      id: string
      uri: string
      args?: object
      droptoken?: string
      duration?: number
      state?: object
      tokens?: object
    }): Promise<any>

    runFlowCardCondition(options: {
      id: string
      uri: string
      args?: object
      droptoken?: string
      state?: object
      tokens?: object
    }): Promise<any>

    shareFlow(options: { id: string }): Promise<any>

    testFlow(options: {
      flow: {
        actions: any[]
        conditions: any[]
        trigger: object
      }
      sessionId: string
      tokens: object
    }): Promise<any>

    triggerAdvancedFlow(options: { id: string }): Promise<any>

    triggerFlow(options: { id: string }): Promise<any>

    updateAdvancedFlow(options: {
      advancedflow: any
      id: string
    }): Promise<ManagerFlow.AdvancedFlow>

    updateFlow(options: {
      flow: {
        actions?: any[]
        conditions?: any[]
        enabled?: boolean
        folder?: string
        name?: string
        trigger?: object
      }
      id: string
    }): Promise<ManagerFlow.Flow>

    updateFlowFolder(options: {
      flowfolder: {
        name?: string
        parent?: string
      }
      id: string
    }): Promise<ManagerFlow.FlowFolder>
  }

  export class ManagerFlowToken extends HomeyAPIV3.ManagerFlowToken {
    getFlowToken(options: { id: string }): Promise<ManagerFlowToken.FlowToken>

    getFlowTokens(): Promise<Record<string, ManagerFlowToken.FlowToken>>

    getFlowTokenValue(options: { id: string }): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerGeolocation extends HomeyAPIV3.ManagerGeolocation {
    getOptionAddress(): Promise<any>

    getOptionLocation(): Promise<any>

    getState(): Promise<any>

    setOptionAddress(options: { value: any }): Promise<any>

    setOptionLocation(options: { value: any }): Promise<any>

    unsetOptionAddress(): Promise<any>

    unsetOptionLocation(): Promise<any>
  }

  export class ManagerGoogleAssistant extends HomeyAPIV3.ManagerGoogleAssistant {
    getOptionPinCode(): Promise<any>

    getState(): Promise<any>

    setOptionPinCode(options: { value: any }): Promise<any>

    unsetOptionPinCode(): Promise<any>
  }

  export class ManagerI18n extends HomeyAPIV3.ManagerI18n {
    getOptionLanguage(): Promise<any>

    getOptionUnits(): Promise<any>

    getState(): Promise<any>

    setOptionLanguage(options: { value: any }): Promise<any>

    setOptionUnits(options: { value: any }): Promise<any>

    unsetOptionLanguage(): Promise<any>

    unsetOptionUnits(): Promise<any>
  }

  export class ManagerIcons extends HomeyAPIV3.ManagerIcons {
    getState(): Promise<any>
  }

  export class ManagerImages extends HomeyAPIV3.ManagerImages {
    getImages(): Promise<Record<string, ManagerImages.Image>>

    getState(): Promise<any>
  }

  export class ManagerInsights extends HomeyAPIV3.ManagerInsights {
    deleteLog(options: { id: string; uri: string }): Promise<any>

    deleteLogEntries(options: { id: string; uri: string }): Promise<any>

    getLog(options: { id: string }): Promise<ManagerInsights.Log>

    getLogEntries(options: {
      id: string
      uri: string
      resolution?: string
    }): Promise<any>

    getLogs(): Promise<Record<string, ManagerInsights.Log>>

    getState(): Promise<any>
  }

  export class ManagerLogic extends HomeyAPIV3.ManagerLogic {
    createVariable(options: {
      variable: {
        name: string
        type: string
        value: boolean | number | string
      }
    }): Promise<ManagerLogic.Variable>

    deleteVariable(options: { id: string }): Promise<any>

    getState(): Promise<any>

    getVariable(options: { id: string }): Promise<ManagerLogic.Variable>

    getVariables(): Promise<Record<string, ManagerLogic.Variable>>

    updateVariable(options: {
      id: string
      variable: {
        name?: string
        value?: boolean | number | string
      }
    }): Promise<ManagerLogic.Variable>
  }

  export class ManagerMobile extends HomeyAPIV3.ManagerMobile {
    onMobileEvent(options: {
      data: any
      deviceId: string
      event: string
      secret: string
      userId: string
      timestamp?: string
    }): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerMoods extends HomeyAPIV3.ManagerMoods {
    createMood(options: {
      mood: {
        devices: object
        name: string
        preset?: string
      }
    }): Promise<ManagerMoods.Mood>

    deleteMood(options: { id: string }): Promise<any>

    getMood(options: { id: string }): Promise<ManagerMoods.Mood>

    getMoods(): Promise<Record<string, ManagerMoods.Mood>>

    getState(): Promise<any>

    setMood(options: { id: string }): Promise<any>

    updateMood(options: {
      id: string
      mood: {
        devices?: object
        name?: string
        preset?: string
      }
    }): Promise<ManagerMoods.Mood>
  }

  export class ManagerNotifications extends HomeyAPIV3.ManagerNotifications {
    deleteNotification(options: { id: string }): Promise<any>

    deleteNotifications(options: { ownerUri?: string }): Promise<any>

    getNotifications(): Promise<
      Record<string, ManagerNotifications.Notification>
    >

    getOwners(): Promise<any>

    getState(): Promise<any>

    setOwnerEnabled(options: { enabled: boolean; uri: string }): Promise<any>

    setOwnerPush(options: { push: boolean; uri: string }): Promise<any>
  }

  export class ManagerPremium extends HomeyAPIV3.ManagerPremium {}

  export class ManagerPresence extends HomeyAPIV3.ManagerPresence {
    getAsleep(options: { id: string }): Promise<any>

    getPresent(options: { id: string }): Promise<any>

    getState(): Promise<any>

    setAsleep(options: { id: string; value?: boolean }): Promise<any>

    setAsleepMe(options: {
      opts?: {
        forceFlowTrigger?: boolean
      }
      value?: boolean
    }): Promise<any>

    setPresent(options: { id: string; value?: boolean }): Promise<any>

    setPresentMe(options: {
      opts?: {
        forceFlowTrigger?: boolean
      }
      value?: boolean
    }): Promise<any>
  }

  export class ManagerRF extends HomeyAPIV3.ManagerRF {
    emulate(options: { data: any[]; frequency: string }): Promise<any>

    getState(): Promise<any>

    record(options: { frequency?: string; timeout?: number }): Promise<any>

    replay(options: { data: any[]; frequency: string }): Promise<any>

    set433MHzConfig(options: {
      baudrate?: number
      carrier?: number
      channelSpacing?: number
      deviation?: number
      filterBandwidth?: number
      modulation?: string
      power?: number
    }): Promise<any>

    txInfraredProntohex(options: {
      payload: string
      repetitions?: number
    }): Promise<any>
  }

  export class ManagerSafety extends HomeyAPIV3.ManagerSafety {
    getState(): Promise<any>
  }

  export class ManagerSecurity extends HomeyAPIV3.ManagerSecurity {
    getState(): Promise<any>
  }

  export class ManagerSessions extends HomeyAPIV3.ManagerSessions {
    getSessionMe(): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerSystem extends HomeyAPIV3.ManagerSystem {
    delete(): Promise<any>

    getInfo(): Promise<any>

    getMemoryInfo(): Promise<any>

    getState(): Promise<any>

    getStorageInfo(): Promise<any>

    getSystemName(): Promise<any>

    ping(options: { id?: string }): Promise<any>

    reboot(): Promise<any>

    sendLog(options: { append?: string }): Promise<any>

    setSystemName(options: { name: string }): Promise<any>
  }

  export class ManagerUsers extends HomeyAPIV3.ManagerUsers {
    acceptSharingInvite(options: {
      athomId: string
      inviteToken: string
      name: string
      secret: string
    }): Promise<any>

    createUser(options: {
      user: {
        role: string
      }
    }): Promise<ManagerUsers.User>

    deleteUser(options: { id: string }): Promise<any>

    deleteUserMe(): Promise<any>

    deleteUserMeProperties(options: { id: string }): Promise<any>

    getState(): Promise<any>

    getUser(options: { id: string }): Promise<ManagerUsers.User>

    getUserMe(): Promise<any>

    getUsers(): Promise<Record<string, ManagerUsers.User>>

    login(options: { token: string }): Promise<any>

    updateUser(options: {
      id: string
      user: {
        enabled?: boolean
        role?: string
      }
    }): Promise<ManagerUsers.User>

    updateUserMe(options: { name?: string }): Promise<any>

    updateUserMeProperties(options: { id: string; value: object }): Promise<any>
  }

  export class ManagerVirtualDevice extends HomeyAPIV3.ManagerVirtualDevice {
    getState(): Promise<any>
  }

  export class ManagerWeather extends HomeyAPIV3.ManagerWeather {
    getState(): Promise<any>

    getWeather(): Promise<any>

    getWeatherHourly(): Promise<any>
  }

  export class ManagerWebserver extends HomeyAPIV3.ManagerWebserver {
    getState(): Promise<any>
  }

  export class ManagerZigbee extends HomeyAPIV3.ManagerZigbee {
    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>
  }

  export class ManagerZones extends HomeyAPIV3.ManagerZones {
    createZone(options: {
      zone: {
        icon: string
        name: string
        parent: string
      }
    }): Promise<ManagerZones.Zone>

    deleteZone(options: { id: string }): Promise<any>

    getState(): Promise<any>

    getZone(options: { id: string }): Promise<ManagerZones.Zone>

    getZones(): Promise<Record<string, ManagerZones.Zone>>

    updateZone(options: {
      id: string
      zone: {
        icon?: string
        name?: string
        parent?: string
      }
    }): Promise<ManagerZones.Zone>
  }

  export class ManagerZwave extends HomeyAPIV3.ManagerZwave {
    getLog(): Promise<any>

    getOptionRegionOverride(): Promise<any>

    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>

    setLogEnabled(options: { enabled: boolean }): Promise<any>

    setOptionRegionOverride(options: { value: any }): Promise<any>

    unsetOptionRegionOverride(): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerDevices.Device {
  export class DeviceCapability extends EventEmitter {
    lastChanged: Date | null

    value: boolean | number | string | null

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    destroy(): any

    emit(
      event: string,

      data: any,
    ): any

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any

    setValue(
      value: boolean | number | string,

      options?: {
        duration?: number
      },
    ): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerDrivers {
  export class Driver extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class PairSession extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPI {
  export class HomeyAPIError extends APIError {
    description: string

    message: string

    stack: string

    statusCode: number

    constructor() {
      super()
      this.name = 'HomeyAPIError'
    }
  }

  export class HomeyAPIErrorNotFound extends HomeyAPIError {
    constructor() {
      super()
      this.name = 'HomeyAPIErrorNotFound'
    }
  }
}

export namespace HomeyAPIV3 {
  export class Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Manager extends EventEmitter {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }

  export class ManagerDrivers extends Manager {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }
}

export namespace HomeyAPIV2 {
  export class Manager extends HomeyAPIV3.Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerAlarms extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerApps extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerAudio extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerBackup extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerBLE extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerCloud extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerDatabase extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerDevices extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerDevkit extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerDrivers extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerEnergy extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerExperiments extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerFlow extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerFlowToken extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerGeolocation extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerGoogleAssistant extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerI18n extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerImages extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerInsights extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerLedring extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerLogic extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerMobile extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerNotifications extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerPresence extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerRF extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerSessions extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerSpeechOutput extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerSystem extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerUpdates extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerUsers extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerWeather extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerZigBee extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerZones extends Manager {
    homey: HomeyAPIV3

    uri: string
  }

  export class ManagerZwave extends Manager {
    homey: HomeyAPIV3

    uri: string
  }
}

export namespace HomeyAPIV3Local {
  export class Item extends HomeyAPIV3.Item {
    homey: HomeyAPIV3

    id: string

    manager: HomeyAPIV3.Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Manager extends HomeyAPIV3.Manager {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }

  export class ManagerAlarms extends HomeyAPIV3.ManagerAlarms {
    createAlarm(options: {
      alarm: {
        enabled?: boolean
        name?: string
        repetition?: object
        time?: string
      }
    }): Promise<ManagerAlarms.Alarm>

    deleteAlarm(options: { id: string }): Promise<any>

    getAlarm(options: { id: string }): Promise<ManagerAlarms.Alarm>

    getAlarms(): Promise<Record<string, ManagerAlarms.Alarm>>

    updateAlarm(options: {
      alarm: {
        enabled?: boolean
        name?: string
        repetition?: object
        time?: string
      }
      id: string
    }): Promise<ManagerAlarms.Alarm>
  }

  export class ManagerApi extends HomeyAPIV3.ManagerApi {
    getState(): Promise<any>
  }

  export class ManagerApps extends HomeyAPIV3.ManagerApps {
    disableApp(options: { id: string }): Promise<any>

    enableApp(options: { id: string }): Promise<any>

    getApp(options: { id: string }): Promise<ManagerApps.App>

    getAppLocales(options: { id: string }): Promise<any>

    getAppSetting(options: { id: string; name: string }): Promise<any>

    getAppSettings(options: { id: string }): Promise<ManagerApps.AppSettings>

    getAppStd(options: { id: string; message: string }): Promise<any>

    getApps(): Promise<Record<string, ManagerApps.App>>

    getAppUsage(options: { id: string }): Promise<any>

    getState(): Promise<any>

    installFromAppStore(options: { id: string; channel?: string }): Promise<any>

    restartApp(options: { id: string }): Promise<any>

    setAppSetting(options: {
      id: string
      name: string
      value: any
    }): Promise<any>

    uninstallApp(options: { id: string }): Promise<any>

    unsetAppSetting(options: { id: string; name: string }): Promise<any>

    updateApp(options: {
      app: {
        autoupdate?: boolean
      }
      id: string
    }): Promise<ManagerApps.App>
  }

  export class ManagerArp extends HomeyAPIV3.ManagerArp {
    getState(): Promise<any>
  }

  export class ManagerBackup extends HomeyAPIV3.ManagerBackup {
    getOptionAutomaticBackupsEnabled(): Promise<any>

    getOptionLastSuccessfulBackup(): Promise<any>

    getState(): Promise<any>

    scheduleBackup(): Promise<any>

    setOptionAutomaticBackupsEnabled(options: { value: any }): Promise<any>

    setOptionLastSuccessfulBackup(options: { value: any }): Promise<any>

    unsetOptionAutomaticBackupsEnabled(): Promise<any>

    unsetOptionLastSuccessfulBackup(): Promise<any>
  }

  export class ManagerBLE extends HomeyAPIV3.ManagerBLE {
    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>
  }

  export class ManagerClock extends HomeyAPIV3.ManagerClock {
    getState(): Promise<any>
  }

  export class ManagerCloud extends HomeyAPIV3.ManagerCloud {
    getState(): Promise<any>
  }

  export class ManagerCoprocessor extends HomeyAPIV3.ManagerCoprocessor {
    getBridges(): Promise<any>

    getState(): Promise<any>

    pairBridge(options: { serialHash: string }): Promise<any>
  }

  export class ManagerCron extends HomeyAPIV3.ManagerCron {
    getState(): Promise<any>
  }

  export class ManagerDashboards extends HomeyAPIV3.ManagerDashboards {
    createDashboard(options: {
      dashboard: {
        columns: any[]
        name: string
      }
    }): Promise<ManagerDashboards.Dashboard>

    deleteDashboard(options: { id: string }): Promise<any>

    getAppWidget(options: { id: string }): Promise<ManagerDashboards.AppWidget>

    getAppWidgetAutocomplete(options: {
      id: string
      query: string
      settingId: string
      settings?: object
    }): Promise<any>

    getAppWidgets(): Promise<Record<string, ManagerDashboards.AppWidget>>

    getDashboard(options: { id: string }): Promise<ManagerDashboards.Dashboard>

    getDashboards(): Promise<Record<string, ManagerDashboards.Dashboard>>

    getState(): Promise<any>

    getWidgetStore(options: {
      id: string
    }): Promise<ManagerDashboards.WidgetStore>

    getWidgetStoreState(options: { id: string }): Promise<any>

    getWidgetStores(): Promise<Record<string, ManagerDashboards.WidgetStore>>

    setWidgetStoreState(options: {
      id: string
      state: object
      replace?: boolean
    }): Promise<any>

    updateDashboard(options: {
      dashboard: {
        columns?: any[]
        name?: string
      }
      id: string
    }): Promise<ManagerDashboards.Dashboard>
  }

  export class ManagerDatabase extends HomeyAPIV3.ManagerDatabase {
    getState(): Promise<any>
  }

  export class ManagerDevices extends HomeyAPIV3.ManagerDevices {
    connect(): Promise<any>

    createGroup(options: {
      group: {
        class: string
        deviceIds: any[]
        name: string
        zoneId: string
        iconDeviceId?: string
        iconOverride?: string
      }
    }): Promise<any>

    deleteDevice(options: { id: string }): Promise<any>

    deleteDeviceFromGroup(options: {
      deviceId: string
      groupId: string
    }): Promise<any>

    getCapabilityValue(options: {
      capabilityId: string
      deviceId: string
    }): Promise<any>

    getDevice(options: { id: string }): Promise<ManagerDevices.Device>

    getDeviceSettingsObj(options: { id: string }): Promise<any>

    getDevices(): Promise<Record<string, ManagerDevices.Device>>

    getState(): Promise<any>

    on(
      event: string,

      callback: Function,
    ): any

    setCapabilityValue(options: {
      capabilityId: string
      deviceId: string
      value: boolean | number | string
      opts?: object
      transactionId?: string
    }): Promise<any>

    setDeviceSettings(options: { id: string; settings: object }): Promise<any>

    updateDevice(options: {
      device: {
        hidden?: boolean
        iconOverride?: string
        name?: string
        note?: string
        uiIndicator?: string
        virtualClass?: string
        zone?: string
      }
      id: string
    }): Promise<ManagerDevices.Device>

    updateGroup(options: {
      group: {
        deviceIds?: any[]
        iconDeviceId?: string
        iconOverride?: string
        name?: string
      }
      id: string
    }): Promise<any>
  }

  export class ManagerDevkit extends HomeyAPIV3.ManagerDevkit {
    getAppStdOut(options: { session: string }): Promise<any>

    getState(): Promise<any>

    installApp(options: { manifest: object; clean?: boolean }): Promise<any>

    runApp(options: {
      app: ReadableStream
      clean: boolean
      debug: boolean
      env: object
    }): Promise<any>

    stopApp(options: { session: string }): Promise<any>

    uninstallApp(options: { sessionId: string }): Promise<any>
  }

  export class ManagerDiscovery extends HomeyAPIV3.ManagerDiscovery {
    getState(): Promise<any>
  }

  export class ManagerDrivers extends HomeyAPIV3.ManagerDrivers {
    homey: HomeyAPIV3

    uri: string

    once(
      event: string,

      callback: Function,
    ): any

    addListener(
      event: string,

      callback: Function,
    ): any

    connect(): Promise<void>

    createPairSession(options: {
      pairsession: {
        driverId: string
        type: string
        deviceId?: string
        zoneId?: string
      }
    }): Promise<ManagerDrivers.PairSession>

    createPairSessionDevice(options: {
      device: {
        data: any
        capabilities?: any[]
        capabilitiesOptions?: object
        class?: string
        energy?: object
        icon?: string
        iconOverride?: string
        name?: string
        settings?: object
        store?: object
        zone?: string
      }
      id: string
    }): Promise<any>

    deletePairSession(options: { id: string }): Promise<any>

    deletePairSessionDevice(options: { id: string }): Promise<any>

    destroy(): any

    disconnect(): Promise<void>

    emit(
      event: string,

      data: any,
    ): any

    emitPairingCallback(options: {
      callbackId: string
      id: string
      data?: any
    }): Promise<any>

    emitPairingEvent(options: {
      event: string
      id: string
      data?: any
    }): Promise<any>

    emitPairingHeartbeat(options: { id: string }): Promise<any>

    getDrivers(): Promise<Record<string, ManagerDrivers.Driver>>

    getPairSession(options: { id: string }): Promise<ManagerDrivers.PairSession>

    getState(): Promise<any>

    isConnected(): boolean

    off(
      event: string,

      callback: Function,
    ): any

    on(
      event: string,

      callback: Function,
    ): any

    removeAllListeners(event?: string): any

    removeListener(
      event: string,

      callback: Function,
    ): any
  }

  export class ManagerEnergy extends HomeyAPIV3.ManagerEnergy {
    deleteReports(): Promise<any>

    fetchDynamicElectricityPrices(options: { date: string }): Promise<any>

    getCurrency(): Promise<any>

    getDynamicElectricityPriceUserCosts(): Promise<any>

    getDynamicPricesElectricityZone(): Promise<any>

    getDynamicPricesElectricityZones(): Promise<any>

    getElectricityPriceType(): Promise<any>

    getLiveReport(options: { zone?: string }): Promise<any>

    getOptionElectricityPriceDynamicPreferredInterval(): Promise<any>

    getOptionElectricityPriceFixed(): Promise<any>

    getOptionGasPriceFixed(): Promise<any>

    getOptionWaterPriceFixed(): Promise<any>

    getReportDay(options: { date: string; cache?: string }): Promise<any>

    getReportMonth(options: { yearMonth: string; cache?: string }): Promise<any>

    getReportsAvailable(): Promise<any>

    getReportWeek(options: { isoWeek: string; cache?: string }): Promise<any>

    getReportYear(options: { year: string; cache?: string }): Promise<any>

    getState(): Promise<any>

    resetReportDayCategories(options: {
      options: {
        categories?: any[]
        date?: string
        deviceIds?: any[]
      }
    }): Promise<any>

    setDynamicElectricityPriceUserCosts(options: {
      mathExpression: string
      type?: string
    }): Promise<any>

    setDynamicPricesElectricityZone(options: {
      options: {
        zoneCountryKey?: string
        zoneId?: string
        zoneName?: string
        zoneVersion?: string
      }
    }): Promise<any>

    setElectricityPriceType(options: { type: string }): Promise<any>

    setOptionElectricityPriceDynamicPreferredInterval(options: {
      value: any
    }): Promise<any>

    setOptionElectricityPriceFixed(options: { value: any }): Promise<any>

    setOptionGasPriceFixed(options: { value: any }): Promise<any>

    setOptionWaterPriceFixed(options: { value: any }): Promise<any>

    unsetDynamicElectricityPriceUserCosts(): Promise<any>

    unsetOptionElectricityPriceDynamicPreferredInterval(): Promise<any>

    unsetOptionElectricityPriceFixed(): Promise<any>

    unsetOptionGasPriceFixed(): Promise<any>

    unsetOptionWaterPriceFixed(): Promise<any>
  }

  export class ManagerEnergyDongle extends HomeyAPIV3.ManagerEnergyDongle {
    getOptionPhaseLoadNotificationSettings(): Promise<any>

    setOptionPhaseLoadNotificationSettings(options: {
      value: any
    }): Promise<any>

    unsetOptionPhaseLoadNotificationSettings(): Promise<any>
  }

  export class ManagerExperiments extends HomeyAPIV3.ManagerExperiments {
    disableExperiment(options: { id: string }): Promise<any>

    enableExperiment(options: { id: string }): Promise<any>

    getExperiments(): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerFlow extends HomeyAPIV3.ManagerFlow {
    createAdvancedFlow(options: {
      advancedflow: any
    }): Promise<ManagerFlow.AdvancedFlow>

    createFlow(options: {
      flow: {
        actions: any[]
        conditions: any[]
        name: string
        trigger: object
        enabled?: boolean
        folder?: string
      }
    }): Promise<ManagerFlow.Flow>

    createFlowFolder(options: {
      flowfolder: {
        name: string
        parent?: string
      }
    }): Promise<ManagerFlow.FlowFolder>

    deleteAdvancedFlow(options: { id: string }): Promise<any>

    deleteFlow(options: { id: string }): Promise<any>

    deleteFlowFolder(options: { id: string }): Promise<any>

    getAdvancedFlow(options: { id: string }): Promise<ManagerFlow.AdvancedFlow>

    getAdvancedFlows(): Promise<Record<string, ManagerFlow.AdvancedFlow>>

    getFlow(options: { id: string }): Promise<ManagerFlow.Flow>

    getFlowCardAction(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardAction>

    getFlowCardActions(): Promise<Record<string, ManagerFlow.FlowCardAction>>

    getFlowCardAutocomplete(options: {
      id: string
      name: string
      query: string
      type: string
      uri: string
      args?: object
    }): Promise<any>

    getFlowCardCondition(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardCondition>

    getFlowCardConditions(): Promise<
      Record<string, ManagerFlow.FlowCardCondition>
    >

    getFlowCardTrigger(options: {
      id: string
      uri: string
    }): Promise<ManagerFlow.FlowCardTrigger>

    getFlowCardTriggers(): Promise<Record<string, ManagerFlow.FlowCardTrigger>>

    getFlowFolder(options: { id: string }): Promise<ManagerFlow.FlowFolder>

    getFlowFolders(): Promise<Record<string, ManagerFlow.FlowFolder>>

    getFlows(): Promise<Record<string, ManagerFlow.Flow>>

    getState(): Promise<any>

    runFlowCardAction(options: {
      id: string
      uri: string
      args?: object
      droptoken?: string
      duration?: number
      state?: object
      tokens?: object
    }): Promise<any>

    runFlowCardCondition(options: {
      id: string
      uri: string
      args?: object
      droptoken?: string
      state?: object
      tokens?: object
    }): Promise<any>

    shareFlow(options: { id: string }): Promise<any>

    testFlow(options: {
      flow: {
        actions: any[]
        conditions: any[]
        trigger: object
      }
      sessionId: string
      tokens: object
    }): Promise<any>

    triggerAdvancedFlow(options: { id: string }): Promise<any>

    triggerFlow(options: { id: string }): Promise<any>

    updateAdvancedFlow(options: {
      advancedflow: any
      id: string
    }): Promise<ManagerFlow.AdvancedFlow>

    updateFlow(options: {
      flow: {
        actions?: any[]
        conditions?: any[]
        enabled?: boolean
        folder?: string
        name?: string
        trigger?: object
      }
      id: string
    }): Promise<ManagerFlow.Flow>

    updateFlowFolder(options: {
      flowfolder: {
        name?: string
        parent?: string
      }
      id: string
    }): Promise<ManagerFlow.FlowFolder>
  }

  export class ManagerFlowToken extends HomeyAPIV3.ManagerFlowToken {
    getFlowToken(options: { id: string }): Promise<ManagerFlowToken.FlowToken>

    getFlowTokens(): Promise<Record<string, ManagerFlowToken.FlowToken>>

    getFlowTokenValue(options: { id: string }): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerGeolocation extends HomeyAPIV3.ManagerGeolocation {
    getOptionAddress(): Promise<any>

    getOptionLocation(): Promise<any>

    getState(): Promise<any>

    setOptionAddress(options: { value: any }): Promise<any>

    setOptionLocation(options: { value: any }): Promise<any>

    unsetOptionAddress(): Promise<any>

    unsetOptionLocation(): Promise<any>
  }

  export class ManagerGoogleAssistant extends HomeyAPIV3.ManagerGoogleAssistant {
    getOptionEnabled(): Promise<any>

    getOptionPinCode(): Promise<any>

    getState(): Promise<any>

    setOptionEnabled(options: { value: any }): Promise<any>

    setOptionPinCode(options: { value: any }): Promise<any>

    sync(): Promise<any>

    unsetOptionEnabled(): Promise<any>

    unsetOptionPinCode(): Promise<any>
  }

  export class ManagerI18n extends HomeyAPIV3.ManagerI18n {
    getOptionLanguage(): Promise<any>

    getOptionUnits(): Promise<any>

    getState(): Promise<any>

    setOptionLanguage(options: { value: any }): Promise<any>

    setOptionUnits(options: { value: any }): Promise<any>

    unsetOptionLanguage(): Promise<any>

    unsetOptionUnits(): Promise<any>
  }

  export class ManagerIcons extends HomeyAPIV3.ManagerIcons {
    getState(): Promise<any>
  }

  export class ManagerImages extends HomeyAPIV3.ManagerImages {
    getImages(): Promise<Record<string, ManagerImages.Image>>

    getState(): Promise<any>
  }

  export class ManagerInsights extends HomeyAPIV3.ManagerInsights {
    deleteLog(options: { id: string; uri: string }): Promise<any>

    deleteLogEntries(options: { id: string; uri: string }): Promise<any>

    getLog(options: { id: string }): Promise<ManagerInsights.Log>

    getLogEntries(options: {
      id: string
      uri: string
      resolution?: string
    }): Promise<any>

    getLogs(): Promise<Record<string, ManagerInsights.Log>>

    getState(): Promise<any>
  }

  export class ManagerLedring extends HomeyAPIV3.ManagerLedring {
    getOptionScreensaver(): Promise<any>

    getScreensavers(): Promise<any>

    getState(): Promise<any>

    setOptionScreensaver(options: { value: any }): Promise<any>

    unsetOptionScreensaver(): Promise<any>
  }

  export class ManagerLogic extends HomeyAPIV3.ManagerLogic {
    createVariable(options: {
      variable: {
        name: string
        type: string
        value: boolean | number | string
      }
    }): Promise<ManagerLogic.Variable>

    deleteVariable(options: { id: string }): Promise<any>

    getState(): Promise<any>

    getVariable(options: { id: string }): Promise<ManagerLogic.Variable>

    getVariables(): Promise<Record<string, ManagerLogic.Variable>>

    updateVariable(options: {
      id: string
      variable: {
        name?: string
        value?: boolean | number | string
      }
    }): Promise<ManagerLogic.Variable>
  }

  export class ManagerMatter extends HomeyAPIV3.ManagerMatter {
    deleteFabric(options: {
      deviceId: string
      fabricIndex: number
    }): Promise<any>

    getFabrics(options: { deviceId: string }): Promise<any>

    getOptionPaaSettings(): Promise<any>

    getState(): Promise<any>

    setOptionPaaSettings(options: { value: any }): Promise<any>

    unsetOptionPaaSettings(): Promise<any>
  }

  export class ManagerMobile extends HomeyAPIV3.ManagerMobile {
    getState(): Promise<any>
  }

  export class ManagerMoods extends HomeyAPIV3.ManagerMoods {
    createMood(options: {
      mood: {
        devices: object
        name: string
        preset?: string
      }
    }): Promise<ManagerMoods.Mood>

    deleteMood(options: { id: string }): Promise<any>

    getMood(options: { id: string }): Promise<ManagerMoods.Mood>

    getMoods(): Promise<Record<string, ManagerMoods.Mood>>

    getState(): Promise<any>

    setMood(options: { id: string }): Promise<any>

    updateMood(options: {
      id: string
      mood: {
        devices?: object
        name?: string
        preset?: string
      }
    }): Promise<ManagerMoods.Mood>
  }

  export class ManagerNotifications extends HomeyAPIV3.ManagerNotifications {
    deleteNotification(options: { id: string }): Promise<any>

    deleteNotifications(options: { ownerUri?: string }): Promise<any>

    getNotifications(): Promise<
      Record<string, ManagerNotifications.Notification>
    >

    getOwners(): Promise<any>

    getState(): Promise<any>

    setOwnerEnabled(options: { enabled: boolean; uri: string }): Promise<any>

    setOwnerPush(options: { push: boolean; uri: string }): Promise<any>
  }

  export class ManagerPresence extends HomeyAPIV3.ManagerPresence {
    getAsleep(options: { id: string }): Promise<any>

    getPresent(options: { id: string }): Promise<any>

    getState(): Promise<any>

    setAsleep(options: { id: string; value?: boolean }): Promise<any>

    setAsleepMe(options: {
      opts?: {
        forceFlowTrigger?: boolean
      }
      value?: boolean
    }): Promise<any>

    setPresent(options: { id: string; value?: boolean }): Promise<any>

    setPresentMe(options: {
      opts?: {
        forceFlowTrigger?: boolean
      }
      value?: boolean
    }): Promise<any>
  }

  export class ManagerRF extends HomeyAPIV3.ManagerRF {
    emulate(options: { data: any[]; frequency: string }): Promise<any>

    getState(): Promise<any>

    record(options: { frequency?: string; timeout?: number }): Promise<any>

    replay(options: { data: any[]; frequency: string }): Promise<any>

    set433MHzConfig(options: {
      baudrate?: number
      carrier?: number
      channelSpacing?: number
      deviation?: number
      filterBandwidth?: number
      modulation?: string
      power?: number
    }): Promise<any>

    txInfraredProntohex(options: {
      payload: string
      repetitions?: number
    }): Promise<any>
  }

  export class ManagerSafety extends HomeyAPIV3.ManagerSafety {
    getState(): Promise<any>
  }

  export class ManagerSatellites extends HomeyAPIV3.ManagerSatellites {
    getState(): Promise<any>
  }

  export class ManagerSecurity extends HomeyAPIV3.ManagerSecurity {
    getState(): Promise<any>
  }

  export class ManagerSessions extends HomeyAPIV3.ManagerSessions {
    getSessionMe(): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerSystem extends HomeyAPIV3.ManagerSystem {
    disableWifi(): Promise<any>

    enableWifi(): Promise<any>

    getInfo(): Promise<any>

    getMemoryInfo(): Promise<any>

    getMemoryInfoTotal(): Promise<any>

    getOptionForwardedPort(): Promise<any>

    getState(): Promise<any>

    getStorageInfo(): Promise<any>

    getStorageInfoTotal(): Promise<any>

    getSystemName(): Promise<any>

    ping(options: { id?: string }): Promise<any>

    reboot(): Promise<any>

    rebootOTA(): Promise<any>

    sendLog(options: { append?: string }): Promise<any>

    setDebug(options: { namespace: string }): Promise<any>

    setOptionForwardedPort(options: { value: any }): Promise<any>

    setSystemName(options: { name: string }): Promise<any>

    unsetOptionForwardedPort(): Promise<any>
  }

  export class ManagerThread extends HomeyAPIV3.ManagerThread {
    getNetworkTopology(): Promise<any>

    getState(): Promise<any>
  }

  export class ManagerUpdates extends HomeyAPIV3.ManagerUpdates {
    abortInstallUpdate(): Promise<any>

    getOptionAutoupdate(): Promise<any>

    getOptionChannel(): Promise<any>

    getState(): Promise<any>

    getUpdates(): Promise<any>

    installUpdate(options: { reboot?: boolean; silent?: boolean }): Promise<any>

    setOptionAutoupdate(options: { value: any }): Promise<any>

    setOptionChannel(options: { value: any }): Promise<any>

    unsetOptionAutoupdate(): Promise<any>

    unsetOptionChannel(): Promise<any>
  }

  export class ManagerUsers extends HomeyAPIV3.ManagerUsers {
    createPersonalAccessToken(options: {
      name: string
      scopes: any[]
    }): Promise<any>

    createUser(options: {
      user: {
        role: string
      }
    }): Promise<ManagerUsers.User>

    deletePersonalAccessToken(options: { id: string }): Promise<any>

    deleteUser(options: { id: string }): Promise<any>

    deleteUserMe(): Promise<any>

    deleteUserMeProperties(options: { id: string }): Promise<any>

    getPersonalAccessTokens(): Promise<any>

    getState(): Promise<any>

    getUser(options: { id: string }): Promise<ManagerUsers.User>

    getUserMe(): Promise<any>

    getUsers(): Promise<Record<string, ManagerUsers.User>>

    grantInstallerAccess(): Promise<any>

    login(options: { token: string }): Promise<any>

    requestInstallerAccess(options: { jwt: string }): Promise<any>

    revokeInstallerAccess(): Promise<any>

    swapOwner(options: { newOwnerUserId: string }): Promise<any>

    swapOwnerInstaller(options: {
      jwt: string
      newOwnerUserId: string
    }): Promise<any>

    updateUser(options: {
      id: string
      user: {
        enabled?: boolean
        role?: string
      }
    }): Promise<ManagerUsers.User>

    updateUserMe(options: { name?: string }): Promise<any>

    updateUserMeProperties(options: { id: string; value: object }): Promise<any>
  }

  export class ManagerVirtualDevice extends HomeyAPIV3.ManagerVirtualDevice {
    getState(): Promise<any>
  }

  export class ManagerWeather extends HomeyAPIV3.ManagerWeather {
    getState(): Promise<any>

    getWeather(): Promise<any>

    getWeatherHourly(): Promise<any>
  }

  export class ManagerWebserver extends HomeyAPIV3.ManagerWebserver {
    getState(): Promise<any>
  }

  export class ManagerZigbee extends HomeyAPIV3.ManagerZigbee {
    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>
  }

  export class ManagerZones extends HomeyAPIV3.ManagerZones {
    createZone(options: {
      zone: {
        icon: string
        name: string
        parent: string
      }
    }): Promise<ManagerZones.Zone>

    deleteZone(options: { id: string }): Promise<any>

    getState(): Promise<any>

    getZone(options: { id: string }): Promise<ManagerZones.Zone>

    getZones(): Promise<Record<string, ManagerZones.Zone>>

    updateZone(options: {
      id: string
      zone: {
        icon?: string
        name?: string
        parent?: string
      }
    }): Promise<ManagerZones.Zone>
  }

  export class ManagerZwave extends HomeyAPIV3.ManagerZwave {
    getLog(): Promise<any>

    getOptionRegionOverride(): Promise<any>

    getState(): Promise<any>

    runCommand(options: { command: string; opts?: object }): Promise<any>

    setLogEnabled(options: { enabled: boolean }): Promise<any>

    setOptionRegionOverride(options: { value: any }): Promise<any>

    unsetOptionRegionOverride(): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerApps {
  export class App extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    call(options: {
      body: any
      method: 'DELETE' | 'GET' | 'POST' | 'PUT'
      path: string
    }): Promise<any>

    connect(): Promise<any>

    delete(options: { path: string }): Promise<any>

    disconnect(): Promise<any>

    get(options: { path: string }): Promise<any>

    post(options: { body: object; path: string }): Promise<any>

    put(options: { body: object; path: string }): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerDevices {
  export class Capability extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    title: string

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class Device extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    name: string

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getAdvancedFlows(): Promise<Record<string, ManagerFlow.AdvancedFlow>>

    getDriver(): Promise<ManagerDrivers.Driver>

    getFlows(): Promise<Record<string, ManagerFlow.Flow>>

    getLogs(): Promise<Record<string, ManagerInsights.Log>>

    getZone(): Promise<ManagerZones.Zone>

    makeCapabilityInstance(
      capabilityId: string,

      listener: (value: boolean | number | string) => any,
    ): Device.DeviceCapability

    setCapabilityValue(options: {
      capabilityId: string
      value: boolean | number | string
      opts?: {
        duration?: number
      }
    }): Promise<void>
  }
}

export namespace HomeyAPIV3.ManagerFlow {
  export class AdvancedFlow extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class Flow extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    isBroken(): Promise<any>
  }

  export class FlowCard extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardAction extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardCondition extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }

  export class FlowCardTrigger extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerFlowToken {
  export class FlowToken extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerInsights {
  export class Log extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>
  }
}

export namespace HomeyAPIV3.ManagerZones {
  export class Zone extends Item {
    homey: HomeyAPIV3

    id: string

    manager: Manager

    uri: string

    connect(): Promise<any>

    disconnect(): Promise<any>

    getParent(): Promise<Zone | null>
  }
}
