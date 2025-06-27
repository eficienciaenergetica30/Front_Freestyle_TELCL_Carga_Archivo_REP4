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

  // Deshabilitar controles inicialmente
  $(".provider-switches input, #submit").prop("disabled", true);
  $("#progress-bar-indicator").hide();
  $("#loader").hide();

  // Event listeners
  $("#fecha").change(function () {
    fechaSeleccionada = $(this).val();
    console.log("Fecha seleccionada:", fechaSeleccionada);
  });

  // Configurar proveedores
  $("#flexSwitch1").click(() => selectProvider("INFRA"));
  $("#flexSwitch2").click(() => selectProvider("CFE"));
  $("#flexSwitch3").click(() => selectProvider("APIZACO"));
  $("#flexSwitch4").click(() => selectProvider("ABENT"));

  // Configurar botón de guardar
  $("#submit").click(getTableData);

  // Configurar input de archivo
  $("#inputFile").change(handleFileUpload);

  // Manejar el estilo de selección para los proveedores
  $('.provider-option').click(function () {
    $('.provider-option').removeClass('active');
    $(this).addClass('active');
    $(this).find('.form-check-input').prop('checked', true);
  });

  // Asegurar que el estado activo coincida con el seleccionado
  $('.form-check-input').change(function () {
    if ($(this).is(':checked')) {
      $('.provider-option').removeClass('active');
      $(this).closest('.provider-option').addClass('active');
    }
  });
});

// Manejar subida de archivo
function handleFileUpload(e) {
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

    // Activar controles
    $(".provider-switches input, #submit").prop("disabled", false);
    $("div:nth-child(2)").prop("disabled", false);
    $("div:nth-child(2) *").prop("disabled", false);

    if (fechaSeleccionada) {
      const fecha = new Date(fechaSeleccionada);
      if (isNaN(fecha.getTime())) {
        alert("Formato de fecha inválido. Use el formato AAAA-MM.");
        return;
      }
    }

    // Procesar datos
    processExcelData(obj);
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

    // Ajustar formato de fechas
    row[7] = formatDate(row[7]);
    row[8] = formatDate(row[8]);

    globalArray.push(row);
  }

  // Calcular total de consumo
  let suma = globalArray.reduce((total, row) => total + (row[9] || 0), 0);
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
function cleanTable() {
  $("#tbl-data").empty();
  $("#totalConsumo").empty();
  $(".provider-switches input").prop("checked", false).prop("disabled", true);
  $("#submit").prop("disabled", true);
  $("#fecha").val("");

  idProvider = "";
  globalArray = [];
  titlesTable = [];
  arrayData = [];
  fechaSeleccionada = "";
}
