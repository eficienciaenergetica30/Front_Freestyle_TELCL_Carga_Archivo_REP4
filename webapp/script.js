// Función principal para guardar datos
async function getTableData() {
  if (!idProvider) {
    alert("Seleccione un proveedor");
    return;
  }

  if (!fechaSeleccionada) {
    alert("Seleccione la fecha de facturación del archivo.");
    return;
  }

  if (!fechaSeleccionada) {
    alert("Seleccione el mes y año de facturación.");
    return;
  }

  // Validar formato de fecha (YYYY-MM)
  const fechaRegex = /^\d{4}-\d{2}$/;
  if (!fechaRegex.test(fechaSeleccionada)) {
    alert("Formato de fecha inválido. Use el formato AAAA-MM.");
    return;
  }

  // Mostrar indicadores de carga
  $("#loader").show();
  $("#message").text("Insertando registros, espere por favor...");
  $("#submit").prop("disabled", true);
  $("#inputFile").prop("disabled", true);
  $(".provider-switches input").prop("disabled", true);
  $("#progress-bar-indicator").show();

  console.log("Fecha seleccionada:", fechaSeleccionada);
  const fechaSplit = fechaSeleccionada.split("-");
  const monthNumber = Number(fechaSplit[1]);

  // Configurar barra de progreso
  const progress = $(".progress-bar");
  const totalRows = globalArray.length;
  let processedRows = 0;

  // Función para actualizar progreso
  function updateProgress() {
    const percentage = (processedRows / totalRows) * 100;
    progress
      .css("width", `${percentage}%`)
      .attr("aria-valuenow", percentage)
      .text(`${percentage.toFixed(2)}% completado`);

    if (percentage >= 100) {
      progress.addClass("bg-success");
    }
  }

  // Procesar cada fila
  try {
    for (let i = 0; i < globalArray.length; i++) {
      const row = globalArray[i];
      await postSite(row, monthNumber);

      processedRows++;
      updateProgress();

      // Pequeño delay para no saturar
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Mostrar mensaje de éxito
    $("#message").html(
      `<span class="text-success">Se crearon correctamente ${totalRows} registros</span>`
    );
    alert(`Proceso completado: ${totalRows} registros insertados`);

    // Llamar a la nueva función antes de recargar
    try {
      $("#message").html(
        `<span class="text-info">Activando flujo de facturación, espere por favor...</span>`
      );
      await activateFactFlow();
      console.log("Flujo de facturación activado con éxito");

      // Esperar 3-4 segundos adicionales antes de recargar
      await new Promise(resolve => setTimeout(resolve, 4000));
    } catch (error) {
      console.error("Error al activar el flujo:", error);
      // Continuar con la recarga aunque falle la activación del flujo
    }

    // Recargar después de completar todo
    location.reload();
  } catch (error) {
    console.error("Error en el proceso:", error);
    $("#message").html(
      `<span class="text-danger">Error: ${error.message}</span>`
    );
    alert(
      "Ocurrió un error durante el proceso. Consulte la consola para más detalles."
    );
  } finally {
    $("#loader").hide();
  }
}

// Función para enviar datos al servidor
async function postSite(data, number) {
  try {
    const SingleDateArr1 = data[7]?.split("/") || ["", "", ""];
    const SingleDateArr2 = data[8]?.split("/") || ["", "", ""];

    // Asegurarse de que number sea el mes correcto
    const monthNumber = parseInt(fechaSeleccionada.split("-")[1], 10);



    const response = await axios.post(
      "https://telcl-prd-db-cap-telcl-srv.cfapps.us10.hana.ondemand.com/dataservices/TempElectricFact",
      {
        ClRpu: typeof data[0] == "number" ? data[0].toString() : data[0] || "",
        ClTarifa: typeof data[6] == "number" ? data[6].toString() : data[6] || "",

        AnioDesde: SingleDateArr1[2]?.toString() || "",
        MesDesde: SingleDateArr1[1]?.replace(/^0+/, "").toString() || "",
        DiaDesde: SingleDateArr1[0]?.toString() || "",

        AnioHasta: SingleDateArr2[2]?.toString() || "",
        MesHasta: SingleDateArr2[1]?.replace(/^0+/, "").toString() || "",
        DiaHasta: SingleDateArr2[0]?.toString() || "",

        AnioFac: SingleDateArr2[2]?.toString() || "",
        MesFac: SingleDateArr2[1]?.replace(/^0+/, "").toString() || "",

        AnioFacEnc: fechaSeleccionada.split("-")[0]?.toString() || '',
        MesFacEnc: monthNumber.toString(),

        ConsResu: typeof data[9] === "number" ? data[9] : Number(data[9]) || 0,
        Demanda: typeof data[5] === "number" ? data[5] : Number(data[5]) || 0,
        Reactivos: typeof data[11] === "number" ? data[11] : Number(data[11]) || 0,
        FacPot: typeof data[12] === "number" ? data[12] : Number(data[12]) || 0,
        FacCar: typeof data[13] === "number" ? data[13] : Number(data[13]) || 0,
        ImEnergia: data[14] || 0,
        Iva: parseInt(data[15], 0) || 0,
        ImDap: data[16] || 0,
        ImCredito: data[17] || 0,
        ImTotal: data[18] || 0,
        IdProveedor: idProvider,
        Dem1p: typeof data[5] === "number" ? data[5] : Number(data[5]) || 0,
        Dem2p: typeof data[10] === "number" ? data[10] : Number(data[10]) || 0,

        // Campos opcionales
        Cuenta: "",
        TipoMov: "",
        CgaContr: null,
        ImBfp: null,
        ImBten: null,
        ImEnerTot: null,
        Cons1p: null,
        Cons2p: null,
        Cons3p: null,
        Dem3p: null,
        IdDivision: null,
        RMU: "",
        IdProveedor: idProvider,
        TipoArchivo: "REP4"
      }
    );

    console.log(`Registro ${data[0]} insertado. Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Error al insertar registro ${data[0]}:`, error);
    throw error;
  }
}

// Activar FLujo V1
// async function activateFactFlow() {
//   try {
//       const response = await axios.post('https://cf-eedev-dataintelligenceapi.cfapps.us10.hana.ondemand.com/apiActivateVFlow', {
//           apiVFlowName: "TLCL05_Carga_Datos_Facturacion_Electrica"
//       });
//       console.log(response);
//   } catch (error) {
//       console.error(error);
//       if (axios.isAxiosError(error)) {
//           if (error.response && error.response.data.error) {
//               alert(error.response.data.error);
//           } else {
//               alert('Error en la solicitud HTTP');
//           }
//       } else {
//           alert('Error desconocido');
//       }
//   }
// }

async function activateFactFlow() {
  const FLOW_NAME = "TLCL01_Carga_Datos_Facturacion_Electrica_Prd";
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 segundos mas o menos

  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const response = await axios.post(
        'https://cf-eedev-dataintelligenceapi.cfapps.us10.hana.ondemand.com/apiActivateVFlow',
        { apiVFlowName: FLOW_NAME },
        {
          timeout: 10000, // 10 segundos timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('Flujo activado correctamente:', response.data);
        return response.data; // Devuelve los datos para posible uso posterior
      } else {
        throw new Error(`Respuesta inesperada: ${response.status}`);
      }

    } catch (error) {
      retryCount++;

      if (retryCount >= MAX_RETRIES) {
        console.error(`Error al activar flujo después de ${MAX_RETRIES} intentos:`, error);

        let errorMessage = 'Error desconocido';
        if (axios.isAxiosError(error)) {
          if (error.response) {
            errorMessage = error.response.data?.error ||
              `Error ${error.response.status}: ${error.response.statusText}`;
          } else if (error.request) {
            errorMessage = 'No se recibió respuesta del servidor';
          } else {
            errorMessage = `Error en la configuración de la solicitud: ${error.message}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        alert(`Error al activar flujo: ${errorMessage}`);
        throw error; // Re-lanzamos el error para que pueda ser capturado por getTableData()
      }

      console.warn(`Intento ${retryCount} fallido. Reintentando en ${RETRY_DELAY / 1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}