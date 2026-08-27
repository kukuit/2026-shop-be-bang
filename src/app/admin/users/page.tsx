import { getUsers } from '@/lib/users/user.service'
import UserManager from './UserManager'

export const dynamic = 'force-dynamic'
export default async function UsersPage() { return <UserManager initialUsers={await getUsers()} /> }
