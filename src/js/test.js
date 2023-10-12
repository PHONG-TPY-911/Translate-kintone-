let numberArr = [
    [10, 20, 60],
    [8, 10, 52],
    [15, 5, 24],
    [26, 28, 43],
    [12, 16, 51]
  ];
  
  var sum = 0;
  numberArr.forEach((row) => {
    console.log('1',row);
    row.forEach((element) => {
        console.log('2',element);
      sum += element;
    });
  });
  console.log("The sum of all elements in the array is:" + sum); // returns "The sum of all elements in the array is: 380"