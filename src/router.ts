// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `*`
  | `/`
  | `/history`
  | `/landing`
  | `/new-topic`
  | `/preview`
  | `/settings`
  | `/topics`
  | `/topics/:id`

export type Params = {
  '/*': { '*': string }
  '/topics/:id': { id: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
