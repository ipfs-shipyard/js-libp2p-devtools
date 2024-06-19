import 'react'
import { Button } from '../button.js'
import { TextInput } from '../text-input.js'
import { Panel } from '../panel.js'
import { Component, type FormEvent } from 'react'
import type { MetricsRPC } from '@libp2p/devtools-metrics'
import { SmallError, SmallSuccess } from '../status'
import { bases } from 'multiformats/basics'

// @ts-expect-error - Not easy to combine these types.
const multibaseDecoder = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

export interface GetProps {
  metrics: MetricsRPC
}

export interface GetState {
  target: string
  error: string
  details: JSX.Element[]
}

export class Get extends Component<GetProps, GetState> {
  constructor (props: GetProps) {
    super(props)

    this.state = {
      target: '',
      error: '',
      details: []
    }
  }

  componentDidMount(): void {
    this.setState({
      target: '',
      error: '',
      details: []
    })
  }

  private get (evt: FormEvent | Event, target: string): boolean {
    evt.preventDefault()

    this.setState({
      error: '',
      details: []
    })

    target = target?.trim()

    if (target == null || target === '') {
      this.setState({
        error: 'Please enter a key'
      })

      return false
    }

    let key: Uint8Array

    try {
      key = multibaseDecoder.decode(target)
    } catch {
      this.setState({
        error: 'Key invalid'
      })

      return false
    }

    this.props.metrics.contentRouting.get(key, {
      onProgress: (event) => {
        console.info('incoming on progress event', event)

        let message: string = event.type

        if (event.type === 'dial:already-connected') {
          message = 'Already connected to this peer'
        } else if (event.type === 'dial:add-to-dial-queue') {
          message = 'Adding dial to queue'
        } else if (event.type === 'dial:already-in-dial-queue') {
          message = 'Dial to this peer already in queue'
        } else if (event.type === 'dial:calculate-addresses') {
          message = 'Calculating addresses'
        } else if (event.type === 'dial:selected-transport') {
          message = `Selected transport ${event.detail}`
        }

        this.setState(s => {
          return {
            details: [
              ...s.details,
              <p key={`event-${s.details.length}`}>{message}</p>
            ]
          }
        })
      }
    })
      .then(() => {
        this.setState(s => {
          return {
            error: '',
            details: [
              ...s.details,
              <SmallSuccess key={`event-${s.details.length}`} message={"Get successful"} />
            ]
          }
        })
      })
      .catch(err => {
        this.setState(s => {
          return {
            details: [
              ...s.details,
              <SmallError key={`event-${s.details.length}`} error={err} />
            ]
          }
        })
      })

    return false
  }

  render () {
    return (
      <Panel>
        <p>Enter a multibase encoded key to look up in the routing:</p>
        <form onSubmit={(evt) => this.get(evt, this.state.target)}>
          <TextInput type="text" value={this.state.target} placeholder="mKey..." onChange={(e) => this.setState({
            target: e.target.value
          })} />
          <Button onClick={(evt) => this.get(evt, this.state.target)} primary={true}>Get</Button>
        </form>
        {this.state.error ? <SmallError error={this.state.error} /> : undefined}
        {this.state.details}
      </Panel>
    )
  }
}
