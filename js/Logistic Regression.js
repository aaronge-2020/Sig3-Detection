Papa.parse("/Data/training_data.csv", {
    header: true,
    download: true,
    dynamicTyping: true,
    complete: function (results) {
        var train = null;

        train = results.data;
        train = train.map((sample) => {

            return Object.values(sample).splice(0, 96).map((sample) => {

                return Number(sample);

            })

        });
        train = train.splice(0, train.length - 1);
        train_x = new ML.Matrix(train);
    }
});

Papa.parse("/Data/is_sig3_20.csv", {
    header: true,
    download: true,
    dynamicTyping: true,
    complete: function (results) {
        var train = null;

        train = results.data;
        train = train.map((sample) => {

            return Object.values(sample).splice(0, 96).map((sample) => {

                return Number(sample);

            })

        });
        train = train.splice(0, train.length - 1);
        train_y = ML.Matrix.columnVector(train);
    }
});


