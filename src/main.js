/**
 * Функция для расчета выручки
 * @param purchase запись о покупке, одна из записей в поле items из чека в data.purchase_records
 * @param _product карточка товара, продукт из коллекции data.products
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - purchase.discount / 100;
    return purchase.sale_price * purchase.quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    // @TODO: Расчет бонуса от позиции в рейтинге
    let percentBonus;
    if (index === 0) {
        percentBonus = 15; // 1 место
    } else if (index === 1 || index === 2) {
        percentBonus = 10; // 2 и 3 место
    } else if (index === total - 1) {
        percentBonus = 0; // последнее место
    } else {
        percentBonus = 5; // Для всех остальных
    }
    return profit * (percentBonus / 100);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных 
    if (!data
        || !Array.isArray(data.customers)
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.customers.length === 0
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0

    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    if (typeof options !== "object") {
        throw new Error('Опции должны быть объектом');
    }
    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Переменные не определены');
    }

    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error('Переменные должны быть функциями');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        // Заполним начальными данными
        id: seller.id, //Строка, идентификатор продавца
        name: `${seller.first_name} ${seller.last_name}`, // Строка, имя продавца
        revenue: 0, // Число с двумя знаками после точки, выручка продавца
        profit: 0, // Число с двумя знаками после точки, прибыль продавца
        sales_count: 0, // Целое число, количество продаж продавца
        products_sold: {} // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца

    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(sellerStat => [sellerStat.id, sellerStat]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        seller.sales_count += 1; // Увеличить количество продаж 
        seller.revenue += record.total_amount; //  Увеличить общую сумму всех продаж

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = product.purchase_price * item.quantity;// Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const revenue = calculateRevenue(item, product); // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const profit = revenue - cost;// Посчитать прибыль: выручка минус себестоимость
            seller.profit += profit;// Увеличить общую накопленную прибыль (profit) у продавца  

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
            // По артикулу товара увеличить число всех проданных товаров у продавца на количество проданных товаров в конкретном чеке 
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit); //функция сортировки по возрастанию


    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
        seller.top_products = Object.entries(seller.products_sold).map(([sku, quantity]) => ({ sku, quantity }));
        seller.top_products.sort((a, b) => b.quantity - a.quantity); //функция сортировки по убыванию
        seller.top_products = seller.top_products.slice(0, 10);//Формируем топ-10 
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id, // Строка, идентификатор продавца
        name: seller.name, // Строка, имя продавца
        revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count, // Целое число, количество продаж продавца
        top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
    }));
}

