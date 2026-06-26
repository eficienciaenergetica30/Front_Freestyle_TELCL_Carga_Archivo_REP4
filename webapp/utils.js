// Variables globales
let filePath = "";
let idProvider = "";
let globalArray = [];
let titlesTable = [];
let arrayData = [];
let fechaSeleccionada = "";

const monthList = [
  ["ene", "1"],
  ["feb", "2"],
  ["mar", "3"],
  ["abr", "4"],
  ["may", "5"],
  ["jun", "6"],
  ["jul", "7"],
  ["ago", "8"],
  ["sep", "9"],
  ["oct", "10"],
  ["nov", "11"],
  ["dic", "12"],
];

// Inicialización
$(document).ready(function () {
  console.log("Last Code Update: " + new Date().toLocaleDateString());

  // --- 1. ESTADO INICIAL ---
  // Bloquear todo al arrancar la página (menos el archivo)
  $("#fecha, .provider-switches input, #submit").prop("disabled", true);
  $('.provider-option').addClass('disabled-style'); // Estilo visual opcional para las tarjetas
  $("#progress-bar-indicator").hide();
  $("#loader").hide();

  // --- 2. CONTROL DE FLUJO (EVENT LISTENERS) ---

  // Configurar input de archivo (Paso 1 del flujo)
  $("#inputFile").change(handleFileUpload);

  // Escuchar el cambio de fecha (Paso 2 del flujo)
  $("#fecha").on("change", function () {
    fechaSeleccionada = $(this).val();
    console.log("Fecha seleccionada:", fechaSeleccionada);

    if (fechaSeleccionada) {
      // Si seleccionó fecha, desbloqueamos SOLAMENTE los proveedores
      $(".provider-switches input").prop("disabled", false);
      $('.provider-option').removeClass('disabled-style');
    } else {
      // Si borra la fecha, volvemos a bloquear proveedores y botón guardar
      $(".provider-switches input, #submit").prop("disabled", true).prop('checked', false);
      $('.provider-option').removeClass('active');
      idProvider = "";
    }
  });

  // Escuchar la selección del proveedor (Paso 3 del flujo)
  $('.provider-option').click(function () {
    // Si el input interno está deshabilitado, no hacer nada
    if ($(this).find('.form-check-input').prop('disabled')) return;

    // Manejar clases de diseño activo
    $('.provider-option').removeClass('active');
    $(this).addClass('active');

    // Marcar el radio button e invocar la función del proveedor
    const $radio = $(this).find('.form-check-input');
    $radio.prop('checked', true);
    selectProvider($radio.val());

    // Como ya hay Archivo, Fecha y Proveedor: ¡Desbloqueamos por fin el botón guardar!
    $("#submit").prop("disabled", false);
  });

  // Asegurar consistencia si hacen click directo en el circulito del switch
  $('.form-check-input').change(function (e) {
    if ($(this).prop('disabled')) return;

    if ($(this).is(':checked')) {
      $('.provider-option').removeClass('active');
      $(this).closest('.provider-option').addClass('active');
      selectProvider($(this).val());
      $("#submit").prop("disabled", false);
    }
  });

  // Configurar botón de guardar (Acción final)
  $("#submit").click(getTableData);
});

// Manejar subida de archivo
function handleFileUpload(e) {
  // Si no hay archivo seleccionado (ej. cancelaron el cuadro de diálogo), limpiar y salir
  if (!e.target.files || e.target.files.length === 0) {
    cleanTable();
    return;
  }

  cleanTable();

  // Mostrar loader
  $('#file-loader').show();
  $('#table-container').hide();

  var TmpPath = URL.createObjectURL(e.target.files[0]);
  filePath = TmpPath;

  var form = new FormData();
  form.append("file", $("#inputFile")[0].files[0], filePath);

  var settings = {
    url: "https://telcl-xlsx-to-json-api.cfapps.us10.hana.ondemand.com/uploads",
    method: "POST",
    timeout: 0,
    processData: false,
    mimeType: "multipart/form-data",
    contentType: false,
    data: form,
  };

  $.ajax(settings).done(function (response) {
    const obj = JSON.parse(response);

    // ==========================================
    // CAMBIO CLAVE UX: Aquí solo activamos la FECHA. 
    // Los proveedores se quedan bloqueados hasta que elija fecha.
    // ==========================================
    $("#fecha").prop("disabled", false);
    $("#fecha").focus(); // Invitamos sutilmente al usuario a interactuar con el calendario

    // Procesar y renderizar datos en la tabla
    processExcelData(obj);
  }).fail(function () {
    $('#file-loader').hide();
    alert("Error al procesar el archivo Excel.");
  });
}

// Procesar datos de Excel
function processExcelData(obj) {
  titlesTable = [];
  arrayData = [];
  globalArray = [];

  // Obtener títulos de columnas
  for (var key in obj[0]) {
    titlesTable.push(key);
  }

  // Procesar filas
  obj.map((row, index) => {
    let tempArray = [];
    for (var key in row) {
      tempArray.push(row[key]);
    }
    arrayData.push(tempArray);
  });

  arrayData.unshift(titlesTable);
  processRows(arrayData);
  displayTable(arrayData);

  // Ocultar loader y mostrar tabla
  $('#file-loader').hide();
  $('#table-container').show();
}

// Procesar filas de datos
function processRows(arrayData) {
  for (let i = 1; i < arrayData.length; i++) {
    const row = arrayData[i];

    // NO pre-formatear aquí, dejar los valores raw
    // El formateo se hace en postSite según el proveedor
    globalArray.push(row);
  }

  let suma = globalArray.reduce((total, row) => total + (row[10] || 0), 0);
  $("#totalConsumo").text("Total de consumo: " + suma);
}

// Formatear fecha
function formatDate(date) {
  if (typeof date == "string") {
    return setMonth(date);
  } else if (typeof date == "number") {
    let dateToString = String(date);
    let tempDate;
    if (dateToString.length < 5) {
      tempDate = new Date(Date.UTC(0, 0, date)).toLocaleDateString();
    } else {
      tempDate = new Date(Date.UTC(0, 0, date)).toLocaleDateString();
    }
    return tempDate;
  }
  return date;
}

// Generar tabla
function displayTable(data) {
  const table = $("#tbl-data").empty();

  // Generar encabezado
  const thead = $("<thead>").appendTo(table);
  const headerRow = $("<tr>").appendTo(thead);

  data[0].forEach((key) => {
    $("<th>").text(key).addClass("cellStyle").appendTo(headerRow);
  });

  // Generar filas
  const tbody = $("<tbody>").appendTo(table);
  for (let i = 1; i < data.length && i < 2001; i++) {
    const row = data[i];
    const tr = $("<tr>").appendTo(tbody);

    row.forEach((cell) => {
      $("<td>").text(cell).addClass("cellStyle").appendTo(tr);
    });
  }
}

// Seleccionar proveedor
function selectProvider(provider) {
  idProvider = provider;
  console.log("Proveedor seleccionado:", idProvider);
}

// Convertir mes
function setMonth(fecha) {
  if (!fecha) return "";

  let tempDate = "";
  var divisiones = fecha.split("-");

  for (const [monthName, monthNumber] of monthList) {
    if (divisiones[1] == monthName) {
      tempDate = divisiones[0] + "/" + monthNumber + "/" + divisiones[2];
      break;
    }
  }
  return tempDate;
}

// Limpiar tabla
// Limpiar tabla y reiniciar el flujo por completo
function cleanTable() {
  $("#tbl-data").empty();
  $("#totalConsumo").empty();

  // Bloquear todo de nuevo
  $(".provider-switches input, #submit, #fecha").prop("disabled", true);
  $('.provider-option').removeClass('active');
  $(".provider-switches input").prop('checked', false);
  $("#fecha").val("");

  // Limpiar variables globales
  idProvider = "";
  globalArray = [];
  titlesTable = [];
  arrayData = [];
  fechaSeleccionada = "";
}