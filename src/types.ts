export interface Ingredient {
    id: string;
    name: string;
    icon: string;
}

export interface Recipe {
    id: string;
    name: string;
    icon: string;
    description: string;
    correctIngredients: Ingredient[];
    wrongIngredients: Ingredient[];
    backgroundColor: string;
    plateColor: string;
}

export interface Theme {
    id: string;
    name: string;
    className: string;
    price: number;
}
