import { signPayload } from "../jwsService";

export async function gerarJwsRequest(data: any) {

  const payload = {

    taxRegistrationNumber:
      data.taxRegistrationNumber,

    requestID:
      data.requestID
  };

  return signPayload(payload);
}
