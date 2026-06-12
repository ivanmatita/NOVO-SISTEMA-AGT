export async function validarNIFAGT(
  nif: string
) {

  if (
    nif === "5402112975"
  ) {

    return {

      valido: false,

      estado: "SUSPENSO"
    };
  }

  return {

    valido: true,

    estado: "ACTIVO"
  };
}
