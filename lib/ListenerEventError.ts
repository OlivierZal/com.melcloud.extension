import type Homey from 'homey/lib/Homey'
import type { ListenerEventParams } from '../types'

export default class ListenerEventError extends Error {
  public readonly params?: ListenerEventParams

  public readonly name: string

  public constructor(
    homey: Homey,
    listenerEventName: string,
    listenerEventParams?: ListenerEventParams,
  ) {
    super(homey.__(`log.${listenerEventName}`, listenerEventParams))
    this.name = listenerEventName
    this.params = listenerEventParams
  }
}
