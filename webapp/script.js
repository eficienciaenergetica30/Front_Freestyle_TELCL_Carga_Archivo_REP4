// Función principal para guardar datos
async function getTableData() {
  if (!idProvider) {
    alert("Seleccione un proveedor");
    return;
  }

  if (!fechaSeleccionada || !/^\d{4}-\d{2}$/.test(fechaSeleccionada)) {
    alert("Seleccione la fecha de facturación en formato AAAA-MM");
    return;
  }

  const rowsRead = globalArray.length;
  const executionId = generateHanaSysUUID();
  const executionUser = "ELECTRIC USER";

  $("#loader").show();
  $("#message").text("Insertando registros, espere por favor...");
  $("#submit, #inputFile, .provider-switches input").prop("disabled", true);
  $("#progress-bar-indicator").show();

  // Activar truncateTempElectricFact
  await truncateTempElectricFact();

  setTimeout(() => {
    console.log("Esperando respuesta de truncateTempElectricFact");
  }, "2000");

  const fechaSplit = fechaSeleccionada.split("-");
  const monthNumber = Number(fechaSplit[1]);

  const progress = $(".progress-bar");
  const totalRows = rowsRead;
  let processedRows = 0;
  let failedRecords = [];

  function updateProgress() {
    const percentage = (processedRows / totalRows) * 100;
    progress.css("width", `${percentage}%`).attr("aria-valuenow", percentage).text(`${percentage.toFixed(2)}% completado`);
    if (percentage >= 100) {
      progress.addClass("bg-success");
    }
  }

  async function processBatch(batch) {
    const results = await Promise.allSettled(batch.map(row => postSite(row, monthNumber)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        processedRows++;
      } else {
        failedRecords.push(batch[index]); // Guardamos el registro fallido
      }
      updateProgress();
    });
  }

  try {
    // Cantidad de peticiones por lote (BATCH)
    const batchSize = 100;

    // Primera pasada
    for (let i = 0; i < globalArray.length; i += batchSize) {
      const batch = globalArray.slice(i, i + batchSize);
      await processBatch(batch);
    }

    // Reintentos
    let retries = 0;
    const maxRetries = 3;

    while (failedRecords.length > 0 && retries < maxRetries) {
      console.warn(`Reintento ${retries + 1} de ${maxRetries}: ${failedRecords.length} registros fallidos.`);
      const currentFails = failedRecords;
      failedRecords = []; // limpiar antes del nuevo intento
      for (let i = 0; i < currentFails.length; i += batchSize) {
        const batch = currentFails.slice(i, i + batchSize);
        await processBatch(batch);
      }
      retries++;
    }

    if (failedRecords.length > 0) {
      console.error(`No se pudieron insertar ${failedRecords.length} registros después de ${maxRetries} intentos.`);
    }

    const hasPartialLoad = processedRows < totalRows;
    const processMessageClass = hasPartialLoad ? "text-warning" : "text-success";
    const processMessageText = hasPartialLoad
      ? `Proceso completado con observaciones. Se insertaron ${processedRows} de ${totalRows} registros.`
      : `Proceso completado. Se insertaron ${processedRows} de ${totalRows} registros.`;

    $("#message").html(`<span class="${processMessageClass}">${processMessageText}</span>`);

    $("#message").html(`<span class="text-info">Activando flujo de facturación, espere por favor...</span>`);
    await activateFactFlow({
      p_rows_read: rowsRead,
      p_rows_inserted_init: processedRows,
      p_execution_id_in: executionId,
      p_user: executionUser
    });
    location.reload();

  } catch (error) {
    console.error("Error en el proceso:", error);
    $("#message").html(`<span class="text-danger">Error: ${error.message}</span>`);
    alert("Ocurrió un error durante el proceso. Consulte la consola para más detalles.");
  } finally {
    $("#loader").hide();
  }
}

function generateHanaSysUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").toUpperCase();
  }

  const template = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  return template.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)).toUpperCase();
}

function escapeHtml(value) {
  return $("<div>").text(value || "").html();
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

    console.log(`Registro insertado. Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Error al insertar registro ${data[0]}:`, error);
    throw error;
  }
}

async function truncateTempElectricFact() {
  try {
    const requestOptions = {
      method: "POST",
      redirect: "follow"
    };

    fetch("https://telcl-dev-db-cap-telcl-srv.cfapps.us10.hana.ondemand.com/dataservices/truncateTempElectricFact", requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  } catch (error) {
    console.error('truncateTempElectricFact error:', error);
    throw error;
  }
}

// Funcion para ejecutar SP TLCL01
async function activateFactFlow({ p_rows_read, p_rows_inserted_init, p_execution_id_in, p_user }) {
  try {
    const response = await axios.post(
      'https://tlcl-processes-hub.cfapps.us10.hana.ondemand.com/tlcl-hub/tlcl01',
      {
        p_rows_read,
        p_rows_inserted_init,
        p_execution_id_in,
        p_user
      },
      {
        timeout: 10000, // 10 segundos timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      const data = response.data;

      console.log(response);
      console.log('Respuesta del servicio:', data);

      // Nueva estructura esperada:
      // {
      //   success: true,
      //   success_flag: 1,
      //   message: 'Proceso finalizado con éxito.',
      //   output_params: [1, 'Proceso finalizado con éxito.'],
      //   result_sets_count: 0
      // }

      const serviceSuccess = !!(data && (data.success === true || data.success_flag === 1));
      const hasPartialLoad = Number(p_rows_inserted_init) < Number(p_rows_read);
      const isWarning = serviceSuccess && hasPartialLoad;
      const isSuccess = serviceSuccess && !hasPartialLoad;
      const alertIcon = isWarning ? 'warning' : isSuccess ? 'success' : 'error';
      const alertTitle = isWarning
        ? 'Carga completada con observaciones'
        : isSuccess
          ? 'Proceso completado'
          : 'Proceso no completado';

      let alertMessage = '';
      if (typeof data?.message === 'string' && data.message.trim() !== '') {
        alertMessage = data.message;
      } else if (Array.isArray(data?.output_params) && typeof data.output_params[1] === 'string') {
        alertMessage = data.output_params[1];
      } else {
        alertMessage = serviceSuccess
          ? 'Proceso finalizado con éxito.'
          : 'No se pudo completar el proceso.';
      }

      const flagValue = typeof data?.success_flag !== 'undefined'
        ? data.success_flag
        : (Array.isArray(data?.output_params) ? data.output_params[0] : 'N/D');

      const failedRows = Math.max(Number(p_rows_read) - Number(p_rows_inserted_init), 0);
      const summaryMessage = isWarning
        ? 'El flujo se ejecutó, pero no todos los registros leídos del archivo se cargaron al servicio.'
        : isSuccess
          ? 'Todos los registros leídos del archivo se cargaron correctamente al servicio.'
          : 'No fue posible completar el flujo de facturación.';

      await Swal.fire({
        icon: alertIcon,
        title: alertTitle,
        customClass: {
          popup: 'result-alert-popup',
          title: 'result-alert-title',
          confirmButton: 'result-alert-button'
        },
        buttonsStyling: false,
        html: `
          <div class="result-alert">
            <p class="result-alert__summary">${summaryMessage}</p>
            <div class="result-alert__metrics">
              <div class="result-alert__metric">
                <span>Leídos</span>
                <strong>${p_rows_read}</strong>
              </div>
              <div class="result-alert__metric">
                <span>Cargados</span>
                <strong>${p_rows_inserted_init}</strong>
              </div>
              <div class="result-alert__metric ${failedRows > 0 ? 'is-warning' : ''}">
                <span>No cargados</span>
                <strong>${failedRows}</strong>
              </div>
            </div>
            <div class="result-alert__status">
              <span class="result-alert__status-label">Respuesta del servicio</span>
              <p>${escapeHtml(alertMessage)}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'Entendido',
        allowOutsideClick: false,
        allowEscapeKey: false
      });

      if (serviceSuccess) {
        return data; // ÉXITO: Salir de la función inmediatamente
      }

      throw new Error(`API respondió sin éxito. Flag: ${flagValue}`);
    }

    throw new Error(`Respuesta HTTP inesperada: ${response.status}`);
  } catch (error) {
    console.error(error);
    // Mostrar error al usuario
    await Swal.fire({
      icon: 'error',
      title: 'Error de conexión',
      html: `
        <div class="result-alert">
          <p class="result-alert__summary">Se produjo un error durante la operación.</p>
          <div class="result-alert__status">
            <span class="result-alert__status-label">Detalle</span>
            <p>${escapeHtml(error?.message || 'Se produjo un error en la operación.')}</p>
          </div>
        </div>
      `,
      customClass: {
        popup: 'result-alert-popup',
        title: 'result-alert-title',
        confirmButton: 'result-alert-button'
      },
      buttonsStyling: false,
      confirmButtonText: 'Cerrar',
      allowOutsideClick: false
    });
  }

  // Si llegamos aquí, significa que se agotaron todos los reintentos
  throw new Error('Se agotaron todos los intentos de conexión');
}
