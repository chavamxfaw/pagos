import { CrmPage, type CrmSearch } from '../CrmPage'
export default function Page({ searchParams }: { searchParams: CrmSearch }) { return <CrmPage kind="tasks" searchParams={searchParams} /> }
