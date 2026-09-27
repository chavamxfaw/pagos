export async function readLimitedText(request:Request,maxBytes=16000){
 if(Number(request.headers.get('content-length'))>maxBytes)throw new Error('Solicitud demasiado grande')
 if(!request.body)return ''
 const reader=request.body.getReader(),decoder=new TextDecoder()
 let bytes=0,text=''
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('Solicitud demasiado grande')}text+=decoder.decode(value,{stream:true})}
  return text+decoder.decode()
 }finally{reader.releaseLock()}
}
