import type Homey from 'homey/lib/Homey'
import type { ListenerEventParams } from '../types'

export default class ListenerError extends Error {
  public readonly params?: ListenerEventParams

  public readonly name: string

  public constructor(
    homey: Homey,
    listenerErrorName: string,
    listenerErrorParams?: ListenerEventParams,
  ) {
    super(homey.__(`log.${listenerErrorName}`, listenerErrorParams))
    this.name = listenerErrorName
    this.params = listenerErrorParams
  }
}
