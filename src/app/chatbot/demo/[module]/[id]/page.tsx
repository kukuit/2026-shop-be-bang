import { notFound } from 'next/navigation'
import Detail from '../../_components/Detail'
export default function Page({ params }: { params: { module: string; id: string } }) {
  if (params.module !== 'partners' && params.module !== 'crops' && params.module !== 'ponds') notFound()
  return <Detail entity={params.module} id={params.id} />
}
