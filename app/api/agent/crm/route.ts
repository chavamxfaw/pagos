import { requireAgent,readJsonObject,jsonError,jsonOk } from '@/lib/agent/api'
import { listCrmRecords,saveCrmRecord,convertOpportunityToProject } from '@/lib/crm/service'

export async function GET(request:Request) {
  const context=await requireAgent(request)
  if(context instanceof Response)return context
  const search=new URL(request.url).searchParams
  try{return jsonOk({records:await listCrmRecords({db:context.admin,ownerId:context.ownerId},search.get('kind'),{clientId:search.get('client_id')||undefined,limit:100})})}
  catch(error){return jsonError(error instanceof Error?error.message:'No se pudo consultar el CRM')}
}
export async function POST(request:Request) {
  const context=await requireAgent(request)
  if(context instanceof Response)return context
  const body=await readJsonObject(request)
  if(!body)return jsonError('JSON inválido')
  const actor={db:context.admin,ownerId:context.ownerId}
  try{
    if(body.action==='convert_opportunity')return jsonOk(await convertOpportunityToProject(actor,body.opportunity_id))
    const form=new FormData()
    for(const field of ['title','notes','status','client_id','due_date','amount','next_action','priority','project_id','opportunity_id']) {
      const value=body[field]
      if(value!==undefined&&value!==null){if(typeof value!=='string'&&typeof value!=='number')return jsonError(`Campo inválido: ${field}`);form.set(field,String(value))}
    }
    return jsonOk({record:await saveCrmRecord(actor,body.kind,form,body.id)},{status:body.id?200:201})
  }catch(error){return jsonError(error instanceof Error?error.message:'No se pudo guardar el CRM')}
}
